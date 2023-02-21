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

    RED.nodes.registerType("hd44780-b", function(n) {
		var node = this;
		RED.nodes.createNode(node, n);

		node.devadr = parseInt(n.devadr);
		node.devtyp = parseInt(n.devtyp);
		node.nline = parseInt(n.nline);
		node.is4line = (n.lcdtype == "1");
		node.iserror = false;
		node.status({});

		node.name = n.name || "LCD-BIG #" + node.devadr + ".L" + node.nline;

		if (sysmodule === undefined)
			node.iserror = syslib.outError(node, "driver error", "driver not load, wrong os or not Raspi");
		else if (!node.is4line && (node.nline > 0))
			node.iserror = syslib.outError(node, "inv linenumber", "invalid line number");
		else if (!sysmodule.lcdinitbigfont(node.devadr, node.devtyp, node.is4line))
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

			// String/Number
			var out_txt = String(msg.payload);

			if (typeof out_txt !== "string") {
				syslib.outError(node, "not string", "msg.payload not string");
				return;
			}

			var column = 0;

			// Write to column
			if (msg.hasOwnProperty('column')) {
				column = Number(msg.column);
				if (typeof column == 'number') {
					if (column < 0)
						column = 0;
					else if (node.is4line && (column > 19))
						column = 19;
					else if (!node.is4line && (column > 15))
						column = 15;

				}
				else {
					syslib.outError(node, "inv column", "invalid column number");
				}
			}

			if (!sysmodule.lcdbigtext(node.devadr, node.nline, column, out_txt))
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
