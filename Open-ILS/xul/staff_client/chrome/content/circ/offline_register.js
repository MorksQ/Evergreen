function my_init() {
	try {
		netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
		if (typeof JSAN == 'undefined') { throw( "The JSAN library object is missing."); }
		JSAN.errorLevel = "die"; // none, warn, or die
		JSAN.addRepository('..');
		JSAN.use('util.error'); g.error = new util.error();
		g.error.sdump('D_TRACE','my_init() for offline_register.xul');

		JSAN.use('OpenILS.data'); g.data = new OpenILS.data(); g.data.init({'via':'stash'});

		if (typeof window.xulG == 'object' && typeof window.xulG.set_tab_name == 'function') {
			try { window.xulG.set_tab_name('Standalone'); } catch(E) { alert(E); }
		}

		$('barcode').addEventListener('change',test_patron,false);
		$('barcode').addEventListener('keypress',handle_keypress,false);
		$('submit').addEventListener('command',next_patron,false);

		JSAN.use('util.file');
		JSAN.use('util.widgets');

		var file; var list_data; var ml; var errors = '';

		file = new util.file('offline_ou_list'); 
		if (file._file.exists()) {
			list_data = file.get_object(); file.close();
			ml = util.widgets.make_menulist( list_data[0], list_data[1] );
			ml.setAttribute('id','home_ou'); $('x_home_ou').appendChild(ml);
		} else {
			errors += 'Missing library list.\n';
		}

		file = new util.file('offline_pgt_list');
		if (file._file.exists()) {
			list_data = file.get_object(); file.close();
			ml = util.widgets.make_menulist( list_data[0], list_data[1] );
			ml.setAttribute('id','profile'); $('x_profile').appendChild(ml);
		} else {
			errors += 'Missing profile list.\n';
		}

		file = new util.file('offline_cit_list'); 
		if (file._file.exists()) {
			list_data = file.get_object(); file.close();
			ml = util.widgets.make_menulist( list_data[0], list_data[1] );
			ml.setAttribute('id','ident_type'); $('x_ident_type').appendChild(ml);
		} else {
			errors += 'Missing identification type list.\n';
		}

		file = new util.file('offline_asv_list'); 
		if (file._file.exists()) {
			list_data = file.get_object(); file.close();
			render_surveys('x_surveys', list_data);
		} else {
			errors += 'Missing required surveys.\n';
		}

		if (errors != '') {
			alert('ERROR: Offline patron registration requires some server-generated files.  Please login periodically to retrieve these files.\n' + errors);
			location.href = 'about:blank';
		}

		$('passwd').value = parseInt(Math.random()*8999+1000);

		$('dob').addEventListener('change',handle_check_date,false);
		$('barcode').focus();

		var file = new util.file('offline_delta'); 
		if (file._file.exists()) { g.delta = file.get_object()[0]; file.close(); } else { g.delta = 0; }

	} catch(E) {
		var err_msg = "!! This software has encountered an error.  Please tell your friendly " +
			"system administrator or software developer the following:\ncirc/offline_register.xul\n" + E + '\n';
		try { g.error.sdump('D_ERROR',err_msg); } catch(E) { dump(err_msg); }
		alert(err_msg);
	}
}

function $(id) { return document.getElementById(id); }

function test_patron(ev) {
	try {
		var barcode = ev.target.value;
		if (g.data.bad_patrons[barcode]) {
			var msg = 'Warning: As of ' + g.data.bad_patrons_date.substr(0,15) + ', this barcode (' + barcode + ') was flagged ';
			switch(g.data.bad_patrons[barcode]) {
				case 'L' : msg += 'Lost'; break;
				case 'E' : msg += 'Expired'; break;
				case 'B' : msg += 'Barred'; break;
				case 'D' : msg += 'Blocked'; break;
				default : msg += ' with an unknown code: ' + g.data.bad_patrons[barcode]; break;
			}
			var r = g.error.yns_alert(msg,'Barcode Warning','Ok','Clear',null,'Check here to confirm this message');
			if (r == 1) {
				setTimeout(
					function() {
						ev.target.value = '';
						ev.target.focus();
					},0
				);
			}
		}
	} catch(E) {
		alert(E);
	}
}

function handle_check_date(ev) {
	ev.target.value = check_date(ev.target.value);
}

function check_date(value) {
	JSAN.use('util.date');
	try {
		if (! util.date.check('YYYY-MM-DD',value) ) { throw('Invalid Date'); }
		if (! util.date.check_past('YYYY-MM-DD',value) ) { throw('Patron needs to be born yesterday.'); }
		if ( util.date.formatted_date(new Date(),'%F') == value) { throw('Happy birthday!  You need to be more than 0 days old.'); }
	} catch(E) {
		alert(E);
		value = '';
	}
	return value;
}

function render_surveys(node,obj) {
	node = util.widgets.get(node);
	util.widgets.remove_children(node);

	for (var i in obj) {
		var survey = obj[i];
		var x_gb = document.createElement('groupbox'); node.appendChild(x_gb);
		var x_cp = document.createElement('caption'); 
		x_cp.setAttribute('label',i); x_gb.appendChild(x_cp);
		var x_d = document.createElement('description');
		x_d.appendChild( document.createTextNode( survey.description ) ); x_gb.appendChild(x_d);
		for (var j = 0; j < survey.questions.length; j++) {
			var question = survey.questions[j];
			var x_d = document.createElement('description');
			x_d.appendChild( document.createTextNode( (j+1) + ') ' + question.question ) ); 
			x_gb.appendChild( x_d );
			var x_hb = document.createElement('hbox'); x_hb.setAttribute('flex','1'); 
			x_gb.appendChild(x_hb);
			var x_spacer = document.createElement('spacer'); x_spacer.setAttribute('flex','1');
			x_hb.appendChild(x_spacer);
			var x_ml = util.widgets.make_menulist( [ ['Choose a response...',''] ].concat(question.answers) );
			x_ml.setAttribute('name','survey'); x_hb.appendChild(x_ml);
		}
	}
}

function handle_keypress(ev) {
	if ( (! ev.keyCode) || (ev.keyCode != 13) ) return;
	switch(ev.target) {
		case $('barcode') : setTimeout( function() { $('family_name').focus(); },0 ); break;
		default: break;
	}
}

function check_patron(obj) {
	var errors = '';
	if (! obj.user.billing_address.post_code ) {
		errors += 'Missing Address : Postal Code\n';
		$('post_code').focus();
		$('post_code').parentNode.setAttribute('style','background-color: red');
	} else {
		$('post_code').parentNode.setAttribute('style','');
	}
	if (! obj.user.billing_address.state ) {
		errors += 'Missing Address : State\n';
		$('state').focus();
		$('state').parentNode.setAttribute('style','background-color: red');
	} else {
		$('state').parentNode.setAttribute('style','');
	}
	if (! obj.user.billing_address.city ) {
		errors += 'Missing Address : City\n';
		$('city').focus();
		$('city').parentNode.setAttribute('style','background-color: red');
	} else {
		$('city').parentNode.setAttribute('style','');
	}
	if (! obj.user.billing_address.street1 ) {
		errors += 'Missing Address : Line 1\n';
		$('street1').focus();
		$('street1').parentNode.setAttribute('style','background-color: red');
	} else {
		$('street1').parentNode.setAttribute('style','');
	}
	if (! obj.user.ident_value ) {
		errors += 'Missing Identification Value\n';
		$('ident_value').focus();
		$('ident_value').parentNode.setAttribute('style','background-color: red');
	} else {
		$('ident_value').parentNode.setAttribute('style','');
	}
	if (! obj.user.ident_type ) {
		errors += 'Missing Identification Type\n';
		$('ident_type').focus();
		$('ident_type').parentNode.setAttribute('style','background-color: red');
	} else {
		$('ident_type').parentNode.setAttribute('style','');
	}
	if (! obj.user.dob ) {
		errors += 'Missing Date of Birth\n';
		$('dob').focus();
		$('dob').parentNode.parentNode.setAttribute('style','background-color: red');
	} else {
		$('dob').parentNode.parentNode.setAttribute('style','');
	}
	if (! obj.user.first_given_name ) {
		errors += 'Missing First Name\n';
		$('first_given_name').focus();
		$('first_given_name').parentNode.setAttribute('style','background-color: red');
	} else {
		$('first_given_name').parentNode.setAttribute('style','');
	}
	if (! obj.user.family_name ) {
		errors += 'Missing Last Name\n';
		$('family_name').focus();
		$('family_name').parentNode.setAttribute('style','background-color: red');
	} else {
		$('family_name').parentNode.setAttribute('style','');
	}
	if (! obj.user.passwd ) {
		errors += 'Missing Password\n';
		$('passwd').focus();
		$('passwd').parentNode.setAttribute('style','background-color: red');
	} else {
		$('passwd').parentNode.setAttribute('style','');
	}
	if (! obj.user.card.barcode ) {
		errors += 'Missing Barcode\n';
		$('barcode').focus();
		$('barcode').parentNode.setAttribute('style','background-color: red');
	} else {
		$('barcode').parentNode.setAttribute('style','');
	}
	if (! obj.user.profile ) {
		errors += 'Missing Profile\n';
		$('profile').focus();
		$('profile').parentNode.setAttribute('style','background-color: red');
	} else {
		$('profile').parentNode.setAttribute('style','');
	}
	if (! obj.user.home_ou ) {
		errors += 'Missing Home Library\n';
		$('home_ou').focus();
		$('home_ou').parentNode.setAttribute('style','background-color: red');
	} else {
		$('home_ou').parentNode.setAttribute('style','');
	}
	if (errors != '') throw(errors);
}

function next_patron() {
	try {
		var obj = {}
		obj.timestamp = parseInt( new Date().getTime() / 1000) + g.delta;
		obj.type = 'register';
		obj.user = {};
		obj.user.card = { 'barcode' : $('barcode').value };
		obj.user.profile = $('profile').value;
		obj.user.passwd = $('passwd').value;
		obj.user.ident_type = $('ident_type').value;
		obj.user.ident_value = $('ident_value').value;
		obj.user.first_given_name = $('first_given_name').value;
		obj.user.family_name = $('family_name').value;
		obj.user.home_ou = $('home_ou').value;
		obj.user.dob = $('dob').value;
		obj.user.billing_address = {};
		obj.user.billing_address.street1 = $('street1').value;
		obj.user.billing_address.street2 = $('street2').value;
		obj.user.billing_address.city = $('city').value;
		obj.user.billing_address.state = $('state').value;
		obj.user.billing_address.country = $('country').value;
		obj.user.billing_address.post_code = $('post_code').value;
		obj.user.survey_responses = [];

		var nl = document.getElementsByAttribute('name','survey');
		for (var i = 0; i < nl.length; i++) {
			var value = nl[i].value; if (value == '') continue;
			var values = JSON2js( value );
			var response = { 'survey' : values[2], 'question' : values[1], 'answer' : values[0] };
			obj.user.survey_responses.push( response );
		}

		try {
			check_patron(obj);
		} catch(E) {
			alert('Please fix the following:\n' + E);
			return;
		}

		JSAN.use('util.file'); var file = new util.file('pending_xacts');
		obj.delta = g.delta;
		file.append_object(obj);
		file.close();

		alert('Patron Registration Saved');

		$('passwd').value = parseInt(Math.random()*8999+1000);
		$('barcode').value = ''; $('ident_value').value = ''; $('first_given_name').value = '';
		$('family_name').value = ''; $('dob').value = ''; $('street1').value = '';
		$('street2').value = '';

		file = new util.file('offline_asv_list'); var list_data = file.get_object(); file.close();
		render_surveys('x_surveys', list_data);

		$('barcode').focus();

	} catch(E) {
		dump(E+'\n'); alert(E);
	}
}
