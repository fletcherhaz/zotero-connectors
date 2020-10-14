/*
    ***** BEGIN LICENSE BLOCK *****

    Copyright © 2020 Corporation for Digital Scholarship
            Vienna, Virginia, USA
            https://www.zotero.org

    This file is part of Zotero.

    Zotero is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Zotero is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Zotero.  If not, see <http://www.gnu.org/licenses/>.

    ***** END LICENSE BLOCK *****
*/

/*
 * Based upon the compression from SingleFileZ: extension/core/bg/compression.js
 */

/* global browser, Blob, document, zip, fetch, XMLHttpRequest, TextEncoder, DOMParser, FileReader, stop, setTimeout, clearTimeout, CustomEvent, URL */

Zotero.Compression = (() => {

	const NO_COMPRESSION_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".woff2", ".mp4", ".mp3", ".ogg", ".webp", ".webm"];

	return {
		compressPage
	};

	async function compressPage(pageData, url) {
		zip.workerScriptsPath = "/lib/SingleFileZ/extension/lib/zip/";
		const blobWriter = new zip.BlobWriter("application/zip");
		await new Promise(resolve => blobWriter.init(resolve));
		await new Promise(resolve => blobWriter.writeUint8Array((new TextEncoder()).encode("\ufeff"), resolve));
		const zipWriter = await new Promise((resolve, reject) => zip.createWriter(blobWriter, resolve, reject));
		pageData.url = url;
		pageData.archiveTime = (new Date()).toISOString();
		await addPageResources(zipWriter, pageData, "", url);
		return new Promise(resolve => zipWriter.close(data => resolve(new Blob([data], { type: "application/zip" }))));
	}

	async function addPageResources(zipWriter, pageData, prefixName, url) {
		await new Promise(resolve => zipWriter.add(prefixName + "index.html", new zip.BlobReader(new Blob([pageData.content], { type: "text/html" })), resolve, null, { comment: url }));
		for (const resourceType of Object.keys(pageData.resources)) {
			for (const data of pageData.resources[resourceType]) {
				if (resourceType == "frames") {
					await addPageResources(zipWriter, data, prefixName + data.name, data.url);
				} else {
					let dataReader;
					if (typeof data.content == "string") {
						dataReader = new zip.TextReader(data.content);
					} else {
						dataReader = new zip.BlobReader(new Blob([new Uint8Array(Object.values(data.content))], { type: data.contentType }));
					}
					const options = { comment: data.url && data.url.startsWith("data:") ? "data:" : data.url };
					if (NO_COMPRESSION_EXTENSIONS.includes(data.extension)) {
						options.level = 0;
					}
					await new Promise(resolve => zipWriter.add(prefixName + data.name, dataReader, resolve, null, options));
				}
			}
		}
	}
})();
