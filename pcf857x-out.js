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

    RED.nodes.registerType("pcf857x-out", function(n) {
		var node = this;
		RED.nodes.createNode(node, n);

		node.devadr = parseInt(n.devadr);
		node.devtyp = parseInt(n.devtyp);
		node.iserror = false;
		node.status({});

		node.name = n.name || "pcf857x-out #" + node.devadr;

		if (sysmodule === undefined)
			node.iserror = syslib.outError(node, "driver error", "driver not load, wrong os or not Raspi");
		else if (!sysmodule.init(node.devadr, node.devtyp))
			node.iserror = syslib.outError(node, "open error", "i2c port not open or adress used, check i2c settings");
		
		node.on("input", function (msg) {
			if (node.iserror)
				return;

			var inp_val = msg.payload;

			if (typeof inp_val == 'number')
			{
				if (inp_val < 0)
					inp_val = 0;
				else if (inp_val > 0xFFFF)
					inp_val = 0xFFFF;
				
				if (!sysmodule.write(node.devadr, inp_val))
					syslib.outError(node, "write error", "device not write, check i2c and device");
				else
					syslib.outOk(node);
				
				return;
			}

			if (!Array.isArray(inp_val)) {
				syslib.outError(node, "not array", "msg.payload not array");
				return;
			}

			// check input and convert to boolean array
			for(var i=0; i < inp_val.length; i++) {
				var arrval = Number(inp_val[i]);
				if (isNaN(arrval)) {
					syslib.outError(node, "inv array", "invalid msg.payload array");
					return;
				}

				inp_val[i] = arrval > 0;
			}

			if (!sysmodule.write(node.devadr, inp_val))
				syslib.outError(node, "write error", "device not write, check i2c and device");
			else
				syslib.outOk(node);
		});

		node.on('close', function () {
			sysmodule.deinit(node.devadr);
		});
	});
}
