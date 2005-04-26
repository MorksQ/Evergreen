/* */

function SurveyQuestion(question) {
	debug("Creating new survey question " + question.question() );
	this.question = question;
	this.node = createAppElement("div");
	add_css_class( this.node, "survey_question" );
	var div = createAppElement("div");
	add_css_class(div, "survey_question_question");
	div.appendChild(	
		createAppTextNode(question.question()));
	this.node.appendChild(div);

	this.selector = createAppElement("select");
	add_css_class( this.selector, "survey_answer_selector" );
	this.selector.name = "survey_question_" + question.id();
	this.selector.value = "survey_question_" + question.id();
	this.node.appendChild(this.selector);
}


SurveyQuestion.prototype.getNode = function() {
	return this.node;
}

SurveyQuestion.prototype.addAnswer = function(answer) {
	var option = new Option( answer.answer(), answer.id() );
	add_css_class( option, "survey_answer" );
	this.selector.options[ this.selector.options.length ] = option;
}


function Survey(survey, onclick ) {

	debug("Creating new survey " + survey.name() );
	this.survey = survey;

	this.node			= createAppElement("div");
	this.wrapperNode	= createAppElement("div");
	this.wrapperNode.appendChild(this.node);
	this.nameNode		= createAppElement("div");
	this.nameNode.appendChild(createAppTextNode(survey.name()));
	this.descNode		= createAppElement("div");
	this.descNode.appendChild( createAppTextNode(survey.description()));
	this.qList			= createAppElement("ol");
	this.questions		= new Array();

	add_css_class(this.nameNode,	"survey_name");
	add_css_class(this.descNode,	"survey_description");
	add_css_class(this.node,		"survey" );

	this.node.appendChild( this.nameNode );
	this.node.appendChild( this.descNode );
	this.node.appendChild( this.qList );

	for( var i in survey.questions() ) {
		this.addQuestion( survey.questions()[i] );
	}

	this.buttonDiv	= createAppElement("div");
	add_css_class( this.buttonDiv, "survey_button");
	this.button = createAppElement("input");
	this.button.setAttribute("type", "submit");
	this.button.value = "Submit Survey";
	if(onclick)
		this.button.onclick = onclick;
	this.buttonDiv.appendChild(this.button);
	this.node.appendChild(this.buttonDiv);
}

Survey.prototype.setAction = function(onclick) {
	this.button.onclick = onclick;
}

Survey.prototype.getName = function() {
	debug("getting name for " + this.survey.name() ); 
	return this.survey.name();
}

Survey.prototype.toString = function() {
	return this.wrapperNode.innerHTML;
}

Survey.prototype.getNode = function() {
	return this.node;
}

Survey.prototype.addQuestion = function(question) {
	var questionObj = new SurveyQuestion(question);
	this.questions.push(questionObj);
	for( var i in question.answers() ) {
		questionObj.addAnswer(question.answers()[i]);
	}

	var item = createAppElement("li");
	item.appendChild(questionObj.getNode());
	this.qList.appendChild(item); 
}

/* Global survey retrieval functions.  In each case, if recvCallback
	is not null, the retrieval will be asynchronous and will
	call recvCallback(survey) on each survey retrieved.  Otherwise
	an array of surveys is returned.
	*/

Survey.retrieveRandom = function(user_session, recvCallback) {
	var request = new RemoteRequest(
			"open-ils.circ",
			"open-ils.circ.survey.retrieve.all",
			user_session );
	if( recvCallback ) {

		debug("Retrieving random survey asynchronously");
		var c = function(req) {
			var surveys = req.getResultObject();
			var s = surveys[2];
			debug("Retrieved survey " + s.name() );
			recvCallback(new Survey(s));
		}
		request.setCompleteCallback(c);
		request.send();

	} else {

		request.send(true);
		var surveys = new Array();
		var results = request.getResultObject();
		for(var index in results) {
			var s = results[index];
			debug("Retrieved survey " + s.name());
			surveys.push(new Survey(s));
		}
		return surveys;
	}
}


Survey.retrieveAll = function(user_session, recvCallback) {
	var request = new RemoteRequest(
			"open-ils.circ",
			"open-ils.circ.survey.retrieve.all",
			user_session );
	request.send(true);
	var surveys = new Array();
	var results = request.getResultObject();
	for(var index in results) {
		var s = results[index];
		debug("Retrieved survey " + s.name());
		surveys.push(new Survey(s));
	}
	return surveys;
}


Survey.retrieveRequired = function(user_session, recvCallback) {
	var request = new RemoteRequest(
			"open-ils.circ",
			"open-ils.circ.survey.retrieve.all",
			user_session );
	request.send(true);
	var surveys = new Array();
	var results = request.getResultObject();
	for(var index in results) {
		var s = results[index];
		debug("Retrieved survey " + s.name());
		surveys.push(new Survey(s));
	}
	return surveys;
}



