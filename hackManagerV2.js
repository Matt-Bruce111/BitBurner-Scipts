/** @param {NS} ns */
function findRam(ns, ramReq){
	var servers = ns.getPurchasedServers();
	for (var i = 0; i < servers.length; i++){
		var server = servers[i];
		var freeRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
		if(freeRam >= ramReq){
			return server;
		} else {
			ns.print(`\x1b[1;31m${server} does not have ${ramReq}GB of ram available`)
		}
	}
}

/** @param {NS} ns */
export async function main(ns) {
	var target = ns.args[0];

	while (true){
		// Get Security Levels
		var secLvl = ns.getServerSecurityLevel(target);
		var secMinLvl = ns.getServerMinSecurityLevel(target);

		// Get Money Levels
		var moneyAvailable = ns.getServerMoneyAvailable(target);
		var maxMoney = ns.getServerMaxMoney(target);

		// Get Server and Player data for time calculations
		var server = ns.getServer(target);
		var player = ns.getPlayer();

		// Caluclate hack time and threads 
		var hackingTime = ns.getHackTime(target);
		var hackingPercent = ns.formulas.hacking.hackPercent(server, player);
		var hackThreads = Math.floor(.45 / hackingPercent);

		// Calculate weaken needed to counter the hack
		var weakTime = ns.getWeakenTime(target);
		var secLvlAfterHack = secMinLvl + (hackThreads * .002);
		var weakNeeded = secLvlAfterHack - secMinLvl;
		var weakThreads = Math.ceil(weakNeeded / .05);

		// Caluclate grow time and threads after first weaken procs
		var growthTime = ns.getGrowTime(target);
		var growthPercent = ns.formulas.hacking.growPercent(server, 1, player);
		var growthThreads = 0
		for (var i = 100; growthPercent <= 10.1; i = i + 100){
			growthPercent = ns.formulas.hacking.growPercent(server, i, player);
			growthThreads = i
		}
		// ns.tprint(`Growth Threads = ${growthThreads} ## Growth Percent = ${growthPercent}`)

		// Find free server for first weaken and execute it
		var ramReq = weakThreads * ns.getScriptRam('sleepWeak.js');
		var freeServer = findRam(ns, ramReq);
		ns.scp('sleepWeak.js', freeServer);
		// No delay on first weaken
		ns.exec('sleepWeak.js', freeServer, weakThreads, target, 0);
		
		// Calculate weaken needed to counter the grow
		var secLvlAfterGrow = secMinLvl + (growthThreads * .004);
		weakNeeded = secLvlAfterGrow - secMinLvl;
		weakThreads = Math.ceil(weakNeeded / .05);

		// Find free server for second weaken and execute it
		ramReq = weakThreads * ns.getScriptRam('sleepWeak.js');
		freeServer = findRam(ns, ramReq);
		ns.scp('sleepWeak.js', freeServer);
		// 200ms delay on second weaken
		ns.exec('sleepWeak.js', freeServer, weakThreads, target, 200);

		// Execute the grow
		ramReq = growthThreads * ns.getScriptRam('sleepGrow.js');
		freeServer = findRam(ns, ramReq);
		ns.scp('sleepGrow.js', freeServer);
		// Delay the grow so that it finishes 100ms between the 2 grows
		var delay = weakTime - growthTime + 100;
		ns.exec('sleepGrow.js', freeServer, growthThreads, target, delay);

		// Execute the hack
		ramReq = growthThreads * ns.getScriptRam('sleepHack.js');
		freeServer = findRam(ns, ramReq);
		ns.scp('sleepHack.js', freeServer);
		// Delay the hack so that it finishes 100ms before the first weaken
		delay = weakTime - hackingTime - 100;
		ns.exec('sleepHack.js', freeServer, hackThreads, target, delay);

		await ns.sleep(weakTime + 200);
	}
}
