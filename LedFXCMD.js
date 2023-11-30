/* 

a:zak45
d:25/10/2022
v:1.3.0

Chataigne Module for LedFX
This module connect to ledfx api and let you modify LedFX like virtual On/Off, Effects ...


Italian 	Tempo 	Markings	BPM	Meaning
Larghissimo	24 bpm or slower	Very, very slow
Grave		25 to 45 bpm		Slow and solemn
Lento		45 to 60 bpm		slow
Larghetto	60 to 66 bpm		Rather broad but still quite slow
Adagio		66 to 76 bpm		At ease, slow with great expression
Andante		76 to 108 bpm		At a walking pace
Moderato	108 to 120 bpm		Moderate speed
Allegro		120 to 156 bpm		Fast and Bright
Vivace		156 to 168 bpm		Lively and fast
Presto		168 to 200 bpm		Extremely fast
Prestissimo	200 and over		Faster than Presto

*/
// BPM
// to customize , just change the interval xx-yy (be caution to not overlap, nothing checked)
// logic is to stop at first corresponding entry from Larghissimo to Prestissimo
var tempoBPM =
[
"Larghissimo:0-24",
"Grave:25-45",
"Lento:46-60",
"Larghetto:61-66",
"Adagio:67-76",
"Andante:77-108",
"Moderato:109-120",
"Allegro:121-156",
"Vivace:157-168",
"Presto:169-200",
"Prestissimo:200-1000"	
];
//
var previousScene = "";
var previousMoodScene = "";
var useBPM = false;
var useRTMMD = false;
var delayBwScene = 1;
var previousUpdate = 0;

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
//SCAnalyzer
var SCAexist = root.modules.getItemWithName("SCAnalyzer");
// to made some logic only once at init
var isInit = true;
// 
var checkStatus = false;
var doRefreshScenes = false;
var keepValues = false;
// 
//HOME Location
//%USERPROFILE% for WIN and $HOME for others
var homeDIR = "";
var winHOME = "";
// module
var moduleDIR = "/Chataigne/modules/LedFX/";
var LedFXCmdName= "run.cmd";


//We create necessary entries in modules & sequences. We need OS / Sound Card / HTTP and  Sequence with Trigger / Audio.
function init()
{
	script.log("-- Custom command called init()");	
		
	// create dashboard if not already
	ledFXdashboard();
	
	// update rate 
	script.setUpdateRate(1);
}

function update()
{
	if (isInit === true)
	{ 
		isInit = false;
		
		if (checkModuleExist("OS"))
		{
			script.log("Module OS exist");
			
		} else {
				
			var newOSModule = root.modules.addItem("OS");		
		}

		var SQexist = root.sequences.getItemWithName("Sequence");

		if (SQexist.name == "sequence")
		{	
			script.log("Sequences : Sequence exist");
			
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

		var infos = util.getOSInfos(); 		
			
		script.log("Hello "+infos.username);	
		script.log("We run under : "+infos.name);
		
		// check ledFX process
		if (infos.name.contains("Windows"))
		{			
			var isRunning = root.modules.os.isProcessRunning(LedFXExeName);
			homeDIR = util.getEnvironmentVariable("USERPROFILE") + "/Documents";
			winHOME = util.getEnvironmentVariable("USERPROFILE");			
			
			if ( isRunning == 0 ) {
				
				script.log("LedFX is not running ");
				local.color.set([162/255, 23/255, 12/255, 255/255]);
				util.showMessageBox("LedFX","LedFX is not running .... ?", "warning", "Ok");				
						
			} else {
				 
				script.log("LedFX is running ");
				virtualsList();
				doRefreshScenes = true;				

				local.color.set([4/255, 162/255, 25/255, 255/255]);				
			}
			
		} else {

			var checkProcess = root.modules.os.getRunningProcesses("*");
			var ledFXIsRunning = false;
			var ledFXProcessName = "ledfx";
			homeDIR = util.getEnvironmentVariable("$HOME");			
			
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
				local.color.set([162/255, 23/255, 12/255, 255/255]);
				util.showMessageBox("LedFX","LedFX is not running .... ?", "warning", "Ok");
				
			} else {

				script.log("LedFX is running ");
				virtualsList();
				doRefreshScenes = true;

				local.color.set([4/255, 162/255, 25/255, 255/255]);
			}			
		}
		
		script.log("isinit finished");
		
	} else {

		if (checkStatus === true)
		{
			checkStatus = false;
			checkLedFX();
		}

		if (doRefreshScenes === true)
		{
			doRefreshScenes = false;
			scenesList();
		}
		
		if ((parseInt(util.getTime()) % local.parameters.ledFXRefreshInterval.get()) == 0)
		{
			script.log("status refresh loop");
			keepValues = true;
			ledFXStatus(keepValues);
			local.sendGET(LedFXvirtual_url,"json","Connection: keep-alive","");			
		}
		
		if (useBPM === true)
		{
			// set scene name if LedFX is reachable and not on pause
			if (local.parameters.ledFXPaused.get() == 0)
			{
				setBPMScene();
			}
		} else if (useRTMMD === true)
		{
			// set scene name if LedFX is reachable and not on pause
			if (local.parameters.ledFXPaused.get() == 0)
			{
				setMoodScene();
			}
		}
	}
}

function moduleParameterChanged (param)
{	
	script.log("Param changed : "+param.name);
	
	if (param.name == "ledFXInfo")
	{
		util.gotoURL('https://www.ledfx.app/');
		
	} else if (param.name == "ledFXPaused") {
		
		var myStatus = local.parameters.ledFXPaused.get();
		script.log("Ledfx status changed to : " + myStatus);
		
		if (myStatus == 1)
		{
			local.color.set([162/255, 114/255, 16/255, 255/255]);
			
		} else {
			
			local.color.set([4/255, 162/255, 25/255, 255/255]);
		}
	} else if (param.name == "ledFXRefresh") {

		keepValues = false;
		local.parameters.autoAdd.set(1);
		ledFXStatus(keepValues);
		local.sendGET(LedFXvirtual_url,"json","Connection: keep-alive","");
		
	} else if (param.name == "useBPM") {
		
		if (local.parameters.bpmParams.useBPM.get() == 1)
		{
			script.log("check WLEDAudioSync");
			if (checkModuleExist("WLEDAudioSync"))
			{
				useBPM = true;
				local.parameters.rtmmdParams.useRTMMD.set(0);
				
			} else {
				
				script.log('No WLEDAudioSync module present');
				util.showMessageBox("Warning LedFX", "No WLEDAUdioSync module present", "warning", "OK");
				local.parameters.bpmParams.useBPM.set(0);
			}			
			
		} else {
			
			useBPM = false;			
		}
		
	} else if (param.name == "useRTMMD") {
		
		if (local.parameters.rtmmdParams.useRTMMD.get() == 1)
		{
			script.log("check WLEDAudioSync");
			if (checkModuleExist("WLEDAudioSync"))
			{
				useRTMMD = true;
				local.parameters.bpmParams.useBPM.set(0);
				
			} else {
				
				script.log('No WLEDAudioSync module present');
				util.showMessageBox("Warning LedFX", "No WLEDAUdioSync module present", "warning", "OK");
				local.parameters.rtmmdParams.useRTMMD.set(0);
			}
			
		} else {
			
			useRTMMD = false;			
		}
		
	} else if (param.name == "runLedFX") {
		
		//execute LedFX
		var exeCMD = homeDIR + moduleDIR + LedFXCmdName;
		if (util.fileExists(exeCMD)){
			var launchresult = root.modules.os.launchProcess(exeCMD, false);
		} else {
			util.showMessageBox("Ledfx not found ", "file name : " + exeCMD , "warning", "Ok");			
		}				
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
	if ( (play == 1 && actualStatus == 1) || (play == 0 && actualStatus == 0) )
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
	
	if (restart == 1)
	{
		keepValues = false;
		ledFXStatus(keepValues);
		
		payload = {};
		payload.timeout = 1;
		payload.action = "restart";
		params.payload = payload;

		local.sendPOST(LedFXpower_url,params);  
	}
}

/*
 Scenes Commands
*/

// Activate or not a scene
//{"id":"testscene","action":"activate"}
function sceneOnOff(activate, sceneName)
{
	script.log("-- Custom command scene activation: "+sceneName);
	
	payload = {};
	payload.id = sceneName;	  
	if (activate == 1) 
	{
		payload.action = "activate";
		
	} else {
		
		payload.action = "deactivate";
	}
	params.payload = payload;
	  
	sendPUTValue(LedFXscene_url);
}

// List all scenes and populate root.modules.ledfx.values
function scenesList()
{   
	script.log("-- Custom command scene List");	
	if (isInit === true)
	{
		keepValues = true;
		
	} else {
		
		keepValues = false;		
	}
	ledFXStatus(keepValues);	
	
	local.values.setCollapsed(true);
	
	local.sendGET(LedFXscene_url,"json","Connection: keep-alive","");
}

/*
 Virtual Commands
*/

// Virtual device switch On/Off
function VirtualOnOff(OnOff, deviceName)
{
	script.log("-- Custom command virtual OnOff: ")+deviceName;
	
	payload = {};
	payload.active = OnOff;
	params.payload = payload;
  
	sendPUTValue(LedFXvirtual_url+"/"+deviceName);
}

// Apply effect to virtual device
function VirtualEffect(effect, deviceName)
{   
	script.log("-- Custom command virtual Effect:"+effect);	
	
	payload = {};
	payload.type=effect;
    params.payload = payload;
	
	local.sendPOST(LedFXvirtual_url+"/"+deviceName+"/effects",params);
}

// Remove effect from virtual device
function VirtualRemoveEffect(deviceName)
{   
	script.log("-- Custom command virtual remove Effect: "+deviceName);	
	
    payload = {};
	payload.type=effect;
    params.payload = payload;
	
	local.sendDELETE(LedFXvirtual_url+"/"+deviceName+"/effects");
}

//We get all virtual devices and populate root.modules.ledfx.values
function virtualsList()
{   
	script.log("-- Custom command virtual List");
	if (isInit === true)
	{
		keepValues = true;
		
	} else {
		
		keepValues = false;		
	}
	ledFXStatus(keepValues);	

	local.values.setCollapsed(true);

	local.sendGET(LedFXvirtual_url,"json","Connection: keep-alive","");
}

/*
 Device Commands
 
*/

//We get all  devices and populate root.modules.ledfx.values  (possible bug!!!)
function deviceList()
{   
	script.log("-- Custom command Device List");
	keepValues = false;
	ledFXStatus(keepValues);
		
	local.values.setCollapsed(true);
	
	local.sendGET(LedFXdevice_url,"json","Connection: keep-alive","");
}

/*
 Global Send (PUT)
*/

function sendPUTValue(value)
{   
	script.log("-- Custom command called with value :" + value);
	
	local.sendPUT(value,params);
}

/*
util
*/

// Get Ledfx Status
function ledFXStatus(keepValues)
{
	script.log("-- Custom command Status LedFX");
	
	if (keepValues === false)
	{
		local.parameters.clearValues.trigger();
	}
	
	checkStatus = true;
}

function checkLedFX ()
{
	var testValues = local.values.getJSONData();
	var JSONdata = JSON.stringify(testValues.parameters[0]);
	
	if ( JSONdata == "undefined" )
	{
		script.log("Not able to reach LedFX");
		local.color.set([162/255, 23/255, 12/255, 255/255]);
		
	} else {
		
		if (local.parameters.ledFXPaused.get() == 0) {
		
			script.log("LedFX reachable");
			local.color.set([4/255, 162/255, 25/255, 255/255]);		
		
		} else {
		
			script.log("LedFX reachable but on Pause Mode");
			local.color.set([162/255, 114/255, 16/255, 255/255]);
		}
	}

	checkStatus = false;
}

// create dashboard
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

// this will create devices list (enum) from virtuals value object (allways contains last populated values)
function createDeviceList(command)
{
	script.log('Generate LedFX virtual devices command');
	
	var virtualDevicesList = util.getObjectProperties(local.values.virtuals, true, false);
	var devList = command.addEnumParameter("Device name","Select virtual device");	
	devList.addOption("none","none");

	if (virtualDevicesList.length == 0 && SCAexist.name != "undefined")
	{
		var defVirtual = SCAexist.parameters.ledFXParams.defaultVirtualDeviceName.get();
		devList.addOption(defVirtual,defVirtual);
		
	} else {
	
		for ( var i = 0; i < virtualDevicesList.length ; i++)		
		{	
			devList.addOption(virtualDevicesList[i],virtualDevicesList[i]);
		}
	}
}

// this will create scenes list (enum) from scenes value object (allways contains last populated values)
function createSceneList(command)
{
	script.log('Generate LedFX scenes command');

	var scenesEnumList = util.getObjectProperties(local.values.scenes, true, false);	
	var sceList = command.addEnumParameter("Scene name","Select scene name");
	sceList.addOption("none","none");

	if (scenesEnumList.length == 0 && SCAexist.name != "undefined")
	{
		var defScene = SCAexist.parameters.ledFXParams.defaultSceneName.get();
		sceList.addOption(defScene,defScene);
		
	} else {
	
		for ( var i = 0; i < scenesEnumList.length ; i++)		
		{	
			sceList.addOption(scenesEnumList[i],scenesEnumList[i]);
		}
	}
}

// set scene name if OSC and BPM value exist
function setBPMScene()
{
	script.log('Check BPM to set corresponding scene');
	
	// check OSC present
	var OSCModule = root.modules.getItemWithName("OSC");
	if (OSCModule.name == "undefined")
	{
		// Warning
		script.logWarning("LedFX -- OSC not present, Does WLEDAudiosync loaded and BPM set.... ?");
		
	} else {
		
		// get BPM from OSC
		var OSCBPM = OSCModule.values.getChild("_WLEDAudioSync_beat_BPM");
		
		if (OSCBPM.name != "undefined")
		{
			var OSCBPMV = parseInt(OSCModule.values._WLEDAudioSync_beat_BPM.get());	

			// retreive tempo values
			for( var i = 0; i < tempoBPM.length; i++)
			{
				var tempoName = tempoBPM[i].split(":")[0];
				var tempoMin = parseInt(tempoBPM[i].split(":")[1].split("-")[0]);
				var tempoMax = parseInt(tempoBPM[i].split(":")[1].split("-")[1]);
				// script.log(OSCBPMV, tempoName, tempoMin, tempoMax);
				
				// for tempo in the range and scene not blank, set it.
				if (OSCBPMV >= tempoMin && OSCBPMV <= tempoMax)
				{
					// retreive value and set scene name if different from previous one
					// and time between two updates > delayBwScene
					var sceneName = local.parameters.bpmParams.getChild(tempoName).get();
					var timeBwUpdate = parseInt(util.getTime()) - previousUpdate;
					
					//script.log('time : ' + timeBwUpdate);
					
					// if sceneName blank use default one
					if (sceneName == "")
					{
						sceneName = local.parameters.bpmParams.defaultSceneName.get();
					}					
					if (sceneName != "" && sceneName != previousScene && timeBwUpdate > delayBwScene)
					{
						previousUpdate = parseInt(util.getTime());
						previousScene = sceneName;						
						// script.log("scene to set:" + sceneName);
						sceneOnOff(1, sceneName);
					}
					break;
				}
			}
			
		} else {
			
			script.logWarning("LedFX -- OSC BPM value not present, retrying....");						
		}
	}
}

// set scene name if OSC and Mood value exist
function setMoodScene()
{
	// script.log('Check Mood to set corresponding scene');
	
	// check OSC present
	var OSCModule = root.modules.getItemWithName("OSC");
	if (OSCModule.name == "undefined")
	{
		// Warning
		script.logWarning("LedFX -- OSC not present, Does WLEDAudiosync loaded and RTMMD set.... ?");
		
	} else {
		
		var OSCRTMMD = OSCModule.values.getChild("_WLEDAudioSync_mood_color");
		if (OSCRTMMD.name != "undefined")
		{
			// get Mood from OSC and activate scene
			var mood = OSCModule.wLEDAudioSync.mood.get();	
			var moodSearched = local.parameters.rtmmdParams.getChild(mood);
			if (moodSearched.name != "undefined")
			{
				var scene = moodSearched.get();
				if (scene == "")
				{
					scene = local.parameters.rtmmdParams.defaultSceneName.get();
				}
				if ( previousMoodScene != scene )
				{
					sceneOnOff(1, scene);
					previousMoodScene = scene;
				}
				
			} else {
				
				script.logWarning('Unknown mood received');
			}
			
		} else {
			// warning , no mood param
			script.logWarning("LedFX -- Does WLEDAudiosync loaded and RTMMD set.... ?... retrying...");
		}
	}
}

function checkModuleExist (moduleName)
{
	var moduleExist = root.modules.getItemWithName(moduleName);
	var result = false;
	if (moduleExist.name != "undefined")
	{
		result = true;
	}
	return result;
}


function test()
{

}