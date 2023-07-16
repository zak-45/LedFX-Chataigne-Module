/* 

a:zak45
d:25/10/2022
v:1.1.0

Chataigne Module for LedFX
This module connect to ledfx api and let you modify LedFX like virtual On/Off, Effects ...


*/

// Main module parameters 
var params = {};
params.dataType = "json";
params.extraHeaders = "Content-Type: application/json";
var payload = {}; //the payload can be either a simple string or an object that will be automatically stringified
params.payload = payload;
// LedFX api URLs
var LedFXvirtual_url = "/virtuals";
var LedFXscene_url = "/scenes";
var LedFXdevice_url = "/devices";
var LedFXpower_url = "/power";
// Windows specific
var LedFXExeName = "ledfx.exe";
var ledFXPath = "";
//SCAnalyzer
var SCAexist = root.modules.getItemWithName("SCAnalyzer");
// to made some logic only once at init
var isInit = true;

//We create necessary entries in modules & sequences. We need OS / Sound Card / HTTP and  Sequence with Trigger / Audio.
function init()
{
	script.log("-- Custom command called init()");	

	var OSexist = root.modules.getItemWithName("OS");
	var SCexist = root.modules.getItemWithName("Sound Card");
	var SQexist = root.sequences.getItemWithName("Sequence");


	if (OSexist.name == "os")
	{
		script.log("Module OS exist");
		
	} else {
			
		var newOSModule = root.modules.addItem("OS");		
	}
	
	if (SCexist.name == "soundCard")
	{	
		script.log("Module Sound Card exist");
		
	} else {
			
		var newSCModule = root.modules.addItem("Sound Card"); 		
	}
	
	if (SQexist.name == "sequence")
	{	
		script.log("Sequences Sequence exist");
		
	} else {
			
		var newSequence = root.sequences.addItem();
		var newTSequence = newSequence.layers.addItem("Trigger");
		var newASequence = newSequence.layers.addItem("Audio");			
	}
	
	if (SCAexist.name == "sCAnalyzer")
	{	
		script.log("SCAnalyzer present");
		var ledfxcontainer = SCAexist.parameters.getChild("LedFX Params");
		ledfxcontainer.setCollapsed(false);
	
	} else {
			
		script.log('No SCAnalyzer found');			
	}
	
	// create dashboard if not already
	ledFXdashboard();
}

/*
// execution depend on the user response
function messageBoxCallback(id, result)
{
	script.log("Message box callback : "+id+" : "+result); 
	
	if (id=="confirmLedFX")
	{
		if (result==1){
			var launchresult = root.modules.os.launchApp(ledFXPath+LedFXExeName);					
			script.log("LedFX return code : "+launchresult);					
		}
	}
}
*/

function moduleParameterChanged (param)
{	
	script.log("Param changed : "+param.name);
	
	if (param.name == "ledFXInfo")
	{
		util.gotoURL('https://www.ledfx.app/');
		
	} else if (param.name == "ledFXPaused") {
		
		var ledfxStatus = local.parameters.ledFXPaused.get();
		script.log("Ledfx status changed to : " + ledfxStatus);
		
		if (ledfxStatus == 1)
		{
			local.color.set([162/255, 114/255, 16/255, 255/255]);
			
		} else {
			
			local.color.set([4/255, 162/255, 25/255, 255/255]);
		}
	}	
}

function update()
{
	if (isInit === true)
	{ 

		var infos = util.getOSInfos(); 		
			
		script.log("Hello "+infos.username);	
		script.log("We run under : "+infos.name);
		
		// check ledFX process
		if (infos.name.contains("Windows"))
		{			
			var isRunning = root.modules.os.isProcessRunning(LedFXExeName);
			ledFXPath = util.getEnvironmentVariable("LOCALAPPDATA") + "/Programs/ledfx/";
			
			if ( isRunning == 0 ) {
				
				script.log("LedFX is not running ");
				// util.showYesNoCancelBox("confirmLedFX", "LedFX is not running .... ?", "Do you want to start it ?", "warning", "Yes", "No", "Don't care...");
				local.color.set([162/255, 23/255, 12/255, 255/255]);
				util.showMessageBox("LedFX","LedFX is not running .... ?", "warning", "Ok");				
						
			} else {
				 
				script.log("LedFX is running ");
				local.color.set([4/255, 162/255, 25/255, 255/255]);
				scenesList();
				virtualsList();				
			}
			
		} else {

			var checkProcess = root.modules.os.getRunningProcesses("*");
			var ledFXIsRunning = false;
			var ledFXProcessName = "ledfx";
			
			for ( var i = 0; i < checkProcess.length; i ++)
			{
				if (checkProcess[i].contains(ledFXProcessName))
				{
					ledFXIsRunning = true;					
					break;
				}				
			}

			if (ledFXIsRunning === false) 
			{
				script.log("LedFX is not running ");
				// util.showYesNoCancelBox("confirmLedFX", "LedFX is not running .... ?", "Do you want to start it ?", "warning", "Yes", "No", "Don't care...");
				local.color.set([162/255, 23/255, 12/255, 255/255]);
				util.showMessageBox("LedFX","LedFX is not running .... ?", "warning", "Ok");
				
			} else {

				script.log("LedFX is running ");
				local.color.set([4/255, 162/255, 25/255, 255/255]);
				scenesList();
				virtualsList();					
			}			
		}

		isInit = false;
		script.log("isinit");
	}
}

/*
 Global Ledfx
*/

// Put global LedFX play On or Pause
function LedfxOnOff(play)
{
	script.log("-- Custom command On/Off LedFX", play);
	
	var actualStatus = local.parameters.ledFXPaused.get();	
	if ((play == 1 && actualStatus == 1) || (play == 0 && actualStatus == 0) )
	{
		script.log('update play status');
		payload = {};
		payload.active = true;
		params.payload = payload;

		sendPUTValue(LedFXvirtual_url);  
	}
}

// restart {"timeout":1,"action":"restart"}
function LedfxRestart(restart)
{
	script.log("-- Custom command restart LedFX");
	ledFXStatus();
	if (restart == 1)
	{
		payload = {};
		payload.timeout = 1;
		payload.action = "restart";
		params.payload = payload;
		
		script.log("command sent");
		local.sendPOST(LedFXpower_url,params);  
	}
}

// Get Ledfx Status
function ledFXStatus()
{
	script.log("-- Custom command Status LedFX");

	local.sendGET(LedFXvirtual_url);
	
}

/*
 Scenes Commands
*/

// Acivate or not a scene
//{"id":"testscene","action":"activate"}
function SceneOnOff(scenename,activate)
{
	script.log("-- Custom command scene activation: "+scenename);
	
	payload = {};
	payload.id = scenename;	
	params.payload = payload;
  
	if (activate == 1) 
	{
		payload.action = "activate";
		
	} else {
		
		payload.action = "deactivate";
	}
	  
	sendPUTValue(LedFXscene_url);
}

// List all scenes and populate root.modules.ledfx.values
function scenesList()
{   
	script.log("-- Custom command scene List");
	ledFXStatus();
	
	local.parameters.autoAdd.set(1);
	local.values.setCollapsed(true);
	
	local.sendGET(LedFXscene_url,"json","Connection: keep-alive","");
}

/*
 Virtual Commands
*/

// Virtual device switch On/Off
function VirtualOnOff(devicename,OnOff)
{
	script.log("-- Custom command virtual OnOff: ")+devicename;
	
	local.parameters.autoAdd.set(1);  
	payload = {};
	payload.active = OnOff;
	params.payload = payload;
  
	sendPUTValue(LedFXvirtual_url+"/"+devicename);
}

// Apply effect to virtual device
function VirtualEffect(devicename,effect)
{   
	script.log("-- Custom command virtual Effect:"+effect);	
	ledFXStatus();
	
	local.parameters.autoAdd.set(1);
	payload = {};
	payload.type=effect;
    params.payload = payload;
	
	local.sendPOST(LedFXvirtual_url+"/"+devicename+"/effects",params);
}

// Remove effect from virtual device
function VirtualRemoveEffect(devicename)
{   
	script.log("-- Custom command virtual remove Effect: "+devicename);	
	ledFXStatus();
	
	local.parameters.autoAdd.set(1);	
    payload = {};
	payload.type=effect;
    params.payload = payload;
	
	local.sendDELETE(LedFXvirtual_url+"/"+devicename+"/effects");
}

//We get all virtual devices and populate root.modules.ledfx.values
function virtualsList()
{   
	script.log("-- Custom command virtual List");
	ledFXStatus();
	
	local.parameters.autoAdd.set(1);
	local.values.setCollapsed(true);

	local.sendGET(LedFXvirtual_url,"json","Connection: keep-alive","");
}

/*
 Device Commands
 
*/

//We get all  devices and populate root.modules.ledfx.values  (possible bug!!!)
function DeviceList()
{   
	script.log("-- Custom command Device List");
	ledFXStatus();
	
	local.parameters.autoAdd.set(1);
	local.values.setCollapsed(true);
	
	local.sendGET(LedFXdevice_url,"json","Connection: keep-alive","");
}

/*
 Global Send (PUT)
*/

function sendPUTValue(value)
{   
	script.log("-- Custom command called with value :" + value);
	local.parameters.autoAdd.set(1);
	ledFXStatus();
	
	local.sendPUT(value,params);
}

/*
util
*/

function ledFXdashboard()
{
	var dashExist = root.dashboards.getItemWithName("ledFXWebPage");
	
	if (dashExist.name == "ledFXWebPage"){
		
		script.log('Dashboard present');
		
	} else {

		script.log("Creating LedFX dashboard");
		var newdash = root.dashboards.addItem();
		newdash.dashboard.canvasSize.set(600,400);
		var newiframe = newdash.dashboard.addItem("IFrame"); 
		newiframe.url.set('http://127.0.0.1:8888');		
		newiframe.viewUIPosition.set(-300,-200);
		newiframe.viewUISize.set(600,400);

		newdash.setName("LedFX Web Page");

		root.dashboards.editMode.set(false);
	}
}
 
// This function will be called each time data has been received by HTTP request.
function dataEvent(data, requestURL)
{
	if (data.paused != "undefined")
	{
		script.log("Got Ledfx Status : " + data.paused);
		local.parameters.ledFXPaused.set(data.paused);
	}	
}
