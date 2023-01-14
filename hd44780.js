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

    RED.nodes.registerType("hd44780", function(n) {
		var node = this;
		RED.nodes.createNode(node, n);

		node.devadr = parseInt(n.devadr);
		node.devtyp = parseInt(n.devtyp);
		node.nline = parseInt(n.nline);
		node.is4line = (n.lcdtype == "1");
		node.ralign = n.ralign;
		node.fill = parseInt(n.fill);
		node.bargraph = n.bargraph;
		node.iserror = false;
		node.status({});

		switch(n.fill) {
			case "0": node.fill = " "; break;
			case "1": node.fill = "0"; break;
			case "2": node.fill = "-"; break;
			case "3": node.fill = "_"; break;
			default: node.fill = String.fromCharCode(Number(n.fill)-4); break;
		}

		node.name = n.name || "hd44780 #" + node.devadr + "." + node.nline + (this.bargraph ? "B" : "");

		if (sysmodule === undefined)
			node.iserror = syslib.outError(node, "driver error", "driver not load, wrong os or not Raspi");
		else if (!node.is4line && (node.nline > 1))
			node.iserror = syslib.outError(node, "inv linenumber", "invalid line number");
		else if (!sysmodule.lcdinit(node.devadr, node.devtyp, node.is4line))
			node.iserror = syslib.outError(node, "open error", "i2c port not open or adress used, check i2c settings");

		node.on("input", function (msg) {
			if (node.iserror)
				return;
			
			if (msg.hasOwnProperty('clear'))
				sysmodule.lcdclear(node.devadr);

			if (msg.hasOwnProperty('led')) {
				if (typeof msg.led == 'boolean')
					sysmodule.lcdled(node.devadr, msg.led);
				return;
			}

			// Custom Font
			if (msg.hasOwnProperty('font')) {
				if (!Array.isArray(msg.font)) {
					syslib.outError(node, "inv font", "invalid custom font array");
					return;
				}
				
				for(var i=0; i < msg.font.length; i++) {
					if (typeof msg.font[i] !== "number") {
						syslib.outError(node, "font number", "invalid custom font number");
						return;
					}
	
					if (msg.font[i] < 0)
						msg.font[i] = 0;
					else if (msg.font[i] > 255)
						msg.font[i] = 255;
				}

				if (!sysmodule.lcdcustomfont(node.devadr, msg.font))
					syslib.outError(node, "font error", "custom Font not load");
				else
					syslib.outOk(node);
			}

			// Bargraph
			if (node.bargraph) {
				var nbargraph = Number(msg.payload);
				if (typeof nbargraph == 'number') {
					if (nbargraph > 100)
						nbargraph = 100;
					else if (nbargraph > 100)
						nbargraph = 0;

					if (!sysmodule.lcdbargraph(node.devadr, node.nline, msg.payload))
						syslib.outError(node, "write error", "device not write, check i2c and device");
					else
						syslib.outOk(node);
				}
				else {
					syslib.outError(node, "inv number", "invalid bargraph number");
				}
				return;
			}

			// String/Number
			var out_txt = String(msg.payload);

			if (typeof out_txt !== "string") {
				syslib.outError(node, "not string", "msg.payload not string");
				return;
			}

			if (!sysmodule.lcdtext(node.devadr, node.nline, node.ralign, node.fill, out_txt))
				syslib.outError(node, "write error", "device not write, check i2c and device");
			else
				syslib.outOk(node);
		});

		node.on('close', function () {
			sysmodule.lcdclear(node.devadr);
			sysmodule.deinit(node.devadr);
		});
	});
}
