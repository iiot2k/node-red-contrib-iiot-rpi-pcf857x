/**
 * Copyright 2022 Ocean (iiot2k@gmail.com).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

module.exports = function(RED) {
	const syslib = require("./lib/syslib.js");
	const sysmodule = syslib.LoadModule("rpi_pcf857x");

    RED.nodes.registerType("pcf857x-in", function(n) {
		var node = this;
		RED.nodes.createNode(node, n);

		node.devadr = parseInt(n.devadr);
		node.devtyp = parseInt(n.devtyp);
		node.tupdate = parseInt(n.tupdate);
		node.sendarray = n.sendarray;
		node.onchange = n.onchange;
		node.iserror = false;
		node.status({});

		node.name = n.name || "pcf857x-in #" + node.devadr;

		if (sysmodule === undefined)
			node.iserror = syslib.outError(node, "driver error", "driver not load, wrong os or not Raspi");
		else if (!sysmodule.init(node.devadr, node.devtyp))
			node.iserror = syslib.outError(node, "open error", "i2c port not open or adress used, check i2c settings");

		if (!node.iserror) {
			node.id_tupdate = setInterval(function () {
				var datain = sysmodule.read(node.devadr, node.sendarray);
				if (datain === undefined)
				{
					syslib.outError(node, "read error", "device not read, check i2c and device");
					return;
				}

				var jarr = JSON.stringify(datain); 

				if (!node.onchange || (jarr !== node.jarr)) {
					node.send({ payload: datain, topic: node.name });
					syslib.outOk(node);
					node.jarr = jarr;
				}
			}, node.tupdate);
		}

		node.on('close', function () {
			clearInterval(node.id_tupdate);
			sysmodule.deinit(node.devadr);
		});
	});
}
