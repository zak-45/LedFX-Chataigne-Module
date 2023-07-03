/* 

a:zak45
d:25/10/2022
v:1.0.0

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
var LedFXPath = "";
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
		//root.modules.sCAnalyzer.scripts.sCAnalyzer.reload.trigger();
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
			var launchresult = root.modules.os.launchApp(LedFXPath+LedFXExeName);					
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
		
		script.log("Ledfx status changed to : " + local.parameters.ledFXPaused.get());

	}	
}

function scriptParameterChanged (param)
{
	script.log("Script Param changed : "+param.name);
}

function moduleValueChanged (value) 
{	

	if (param.name == "paused")
	{
		local.parameters.ledFXPaused.set() == local.values.paused.get(); 
	}

}

function update()
{
	if (isInit === true)
	{ 
		if (SCAexist.name == "sCAnalyzer")
		{
			// util.showMessageBox("LEDFX !", "SCAnalyzer present, you need to reload its script", "warning", "OK");
		}

		var infos = util.getOSInfos(); 		
			
		script.log("Hello "+infos.username);	
		script.log("We run under : "+infos.name);
		
		// start ledFX if required : only for Windows
		if (infos.name.contains("Windows"))
		{
			var isRunning = root.modules.os.isProcessRunning(LedFXExeName);
			LedFXPath = util.getEnvironmentVariable("LOCALAPPDATA") + "/Programs/ledfx/";
			
			if ( isRunning == 0 ) {
				
				script.log("LedFX is not running ");
				// util.showYesNoCancelBox("confirmLedFX", "LedFX is not running .... ?", "Do you want to start it ?", "warning", "Yes", "No", "Don't care...");
				util.showMessageBox("LedFX","LedFX is not running .... ?", "warning", "Ok");				
						
			} else {
				 
				script.log("LedFX is running ");
				// check status
				LedfxStatus();
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
	if (play === true)
	{
		payload.active = true;
	} else {
		payload.active = false;
	}

	sendPUTValue(LedFXvirtual_url);  
}

// restart {"timeout":1,"action":"restart"}
function LedfxRestart()
{
	script.log("-- Custom command restart LedFX");

	payload.timeout = 1;
	payload.action = "restart";

	local.sendPOST(LedFXpower_url,params);  
}

// Get Ledfx Status
function LedfxStatus()
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
	var payload = {}; //the payload can be either a simple string or an object that will be automatically stringified
	params.payload = payload;
	payload.id = scenename;	
  
	if (activate == 1) 
	{
		payload.action = "activate";
		
	} else {
		
		payload.action = "deactivate";
	}
	  
	sendPUTValue(LedFXscene_url);
}

// List all scenes and populate root.modules.ledfx.values
function SceneList()
{   
	script.log("-- Custom command scene List");
	
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
	var payload = {}; //the payload can be either a simple string or an object that will be automatically stringified
	params.payload = payload;
	payload.active = OnOff;
  
	sendPUTValue(LedFXvirtual_url+"/"+devicename);
}

// Apply effect to virtual device
function VirtualEffect(devicename,effect)
{   
	script.log("-- Custom command virtual Effect:"+effect);	
	
	local.parameters.autoAdd.set(1);
	var payload = {}; //the payload can be either a simple string or an object that will be automatically stringified
    params.payload = payload;
	payload.type=effect;
	
	local.sendPOST(LedFXvirtual_url+"/"+devicename+"/effects",params);
}

// Remove effect from virtual device
function VirtualRemoveEffect(devicename)
{   
	script.log("-- Custom command virtual remove Effect: "+devicename);	
	
	local.parameters.autoAdd.set(1);	
    var payload = {}; //the payload can be either a simple string or an object that will be automatically stringified
    params.payload = payload;
	payload.type=effect;
	
	local.sendDELETE(LedFXvirtual_url+"/"+devicename+"/effects");
}

//We get all virtual devices and populate root.modules.ledfx.values
function VirtualList()
{   
	script.log("-- Custom command virtual List");
	
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
	
	//local.parameters.autoAdd.set(1);
	
	local.sendPUT(value,params);
}

function ledFXdashboard()
{
	
	var dashExist = root.dashboards.getItemWithName("ledFXWebPage");
	
	if (dashExist.name == "ledFXWebPage"){
		
		script.log('Dashboard present');
		
	} else {

		script.log("Creating LedFX dashboard");
		var newdash = root.dashboards.addItem();
		newdash.dashboard.canvasSize.set(800,600);
		var newiframe = newdash.dashboard.addItem("IFrame"); 
		newiframe.url.set('http://127.0.0.1:8888');
		newiframe.viewUISize.set(800,600);

		newdash.setName("LedFX Web Page");

		root.dashboards.editMode.set(false);
	}
}
 
 
// This function will be called each time data has been received.
function dataEvent(data, requestURL)
{
	if (requestURL.contains("/virtuals"))
	{
		script.log("Ledfx Status : " + data.paused);
		local.parameters.ledFXPaused.setAttribute("readOnly", false);
		local.parameters.ledFXPaused.set(data.paused);
		local.parameters.ledFXPaused.setAttribute("readOnly", true);
	}
}



