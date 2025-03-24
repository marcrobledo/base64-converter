/*
* Base64 Converter
* Vanilla Javascript Base64 encoder/decoder with minimalist GUI.
* (last update: 2025-02-13)
* By Marc Robledo https://www.marcrobledo.com
* Sourcecode: https://github.com/marcrobledo/base64-converter
* License:
*
* MIT License
* 
* Copyright (c) 2025 Marc Robledo
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/


const MAX_DATA_SIZE=0x400000; //4 megabytes



/* UI translation */
const LOCALE={
	'es':{
		'Base64 Converter':'Conversor de Base64',
		'Original data':'Datos originales',
		'Text':'Texto',
		'File':'Archivo',
		'Type text here to encode':'Escribe texto aquí para codificar',
		'Choose a file to encode':'Escoge un archivo para codificar',
		'Download file':'Descargar archivo',
		'Base64 data':'Datos en Base64',
		'Copy to clipboard':'Copiar al portapapeles',
		'Copy SVG as encoded URI':'Copiar SVG como URI codificado',
		'Copied to clipboard':'Copiado al portapapeles',
		'Encoded to Base64':'Codificado a Base64',
		'Trimmed XML and encoded to Base64':'XML recortado y codificado a Base64',
		'Decoded from Base64':'Decodificado desde Base64'
	}
};
const userLanguage=typeof navigator.language === 'string'? navigator.language.substr(0,2).trim() : 'en';
const _=function(str){
	return LOCALE[userLanguage] && LOCALE[userLanguage][str]? LOCALE[userLanguage][str] : str;
}


const currentData={
	raw:null,
	binaryString:null,
	mimeType:null,
	asciiString:null,
	base64:null
}



function downloadFile(){
	const mimeType=currentData.mimeType;
	const blob=new Blob([currentData.binaryString], {type: mimeType});

	const downloadLink=document.createElement('a');
	downloadLink.href=URL.createObjectURL(blob);
	downloadLink.download=guessFileName(currentData.mimeType);
	downloadLink.click();

	URL.revokeObjectURL(blob);
}

function isRawDataASCII(rawData){
	return rawData.every(byte => ((byte>=0x20 && byte<=0x7e) || (byte>=0xa0 && byte<=0xff) || byte===0x09 || byte===0x0a || byte===0x0d));
}

function binaryStringToRawData(binaryString){
	return binaryString.split('').map(c => c.charCodeAt(0));
}
function guessFileName(mimeType){
	if(document.getElementById('input-file').files[0])
		return document.getElementById('input-file').files[0].name
	else if(mimeType==='image/png')
		return 'image.png';
	else if(mimeType==='image/jpeg')
		return 'image.jpg';
	else if(mimeType==='image/gif')
		return 'image.gif';
	else if(mimeType==='image/webp')
		return 'image.webp';
	else if(mimeType==='image/svg+xml')
		return 'image.svg';
	else if(mimeType==='text/plain')
		return 'string.txt';
	return 'data.bin';
}
function guessMimeType(binaryString){
	if(binaryString.length<16)
		return false;

	const rawData=binaryStringToRawData(binaryString.slice(0, 16));

	if(rawData[0]===0x89 && rawData[1]===0x50 && rawData[2]===0x4e && rawData[3]===0x47){
		return 'image/png';
	}else if(rawData[0]===0xff && rawData[1]===0xd8 && rawData[2]===0xff){
		return 'image/jpeg';
	}else if(rawData[0]===0x47 && rawData[1]===0x49 && rawData[2]===0x46){
		return 'image/gif';
	}else if(rawData[0]===0x52 && rawData[1]===0x49 && rawData[2]===0x46 && rawData[3]===0x46){
		return 'image/webp';
	}else if(/^<svg.*<\/ *svg>$/s.test(binaryString.trim())){
		return 'image/svg+xml';
	}

	return false;
}
function trimXML(str){
	return str.trim().replace(/[\n\r\t]/g, '').replace(/ +\/>/g, '/>');
}



function importString(evt){
	if(!document.getElementById('textarea-ascii').value)
		return false;

	const binaryString=document.getElementById('textarea-ascii').value;
	if(binaryString.length>MAX_DATA_SIZE)
		return setStatusMessage('ASCII string is too long', false);

	const rawData=binaryStringToRawData(binaryString)
	if(!isRawDataASCII(rawData))
		return setStatusMessage('String contains non-ASCII characters', false);

	/* set data */
	currentData.raw=rawData;
	currentData.mimeType=guessMimeType(binaryString) || 'text/plain';
	currentData.binaryString=binaryString;
	currentData.asciiString=true;

	/* refresh HTML elements */
	document.getElementById('input-file').value='';

	/* show copy SVG as encoded URI button */
	document.getElementById('buttons-clipboard-uri').style.display=currentData.mimeType==='image/svg+xml'? 'block' : 'none';

	return toBase64();
}


const fileReader=new FileReader();
var fileReaderMimeType;
fileReader.onload=function(evt){
	const binaryString=evt.target.result;
	if(binaryString.length>MAX_DATA_SIZE)
		return setStatusMessage('File is too big', false);
	else if(!binaryString)
		return setStatusMessage('File is empty', false);

	const rawData=binaryStringToRawData(binaryString)

	/* set data */
	currentData.raw=rawData;
	currentData.mimeType=fileReaderMimeType;
	currentData.binaryString=binaryString;
	currentData.asciiString=isRawDataASCII(rawData);

	/* refresh HTML elements */
	document.getElementById('textarea-ascii').value=currentData.asciiString? currentData.binaryString : '';

	return toBase64();
};

function toBase64(refreshAsciiString){
	try{
		const binaryString=currentData.mimeType==='image/svg+xml'? trimXML(currentData.binaryString) : currentData.binaryString;
		currentData.base64=btoa(binaryString);

		/* refresh HTML elements */
		document.getElementById('textarea-base64').value=currentData.base64;
		document.getElementById('textarea-base64').focus();
		document.getElementById('textarea-base64').select();
		refreshFilePreview();
		if(currentData.binaryString !== binaryString){
			return setStatusMessage(_('Trimmed XML and encoded to Base64'), true);
		}else{
			return setStatusMessage(_('Encoded to Base64'), true);
		}
	}catch(err){
		return setStatusMessage('Unable to encode to Base64: '+err.message, false);
	}
}




function fromBase64(){
	if(!document.getElementById('textarea-base64').value)
		return false;

	try{
		const base64=document.getElementById('textarea-base64').value.trim().replace(/[^a-zA-Z0-9\+\=\/]/g, '');

		const binaryString=atob(base64);

		const rawData=binaryStringToRawData(binaryString);
		const isASCII=isRawDataASCII(rawData);

		/* set data */
		currentData.raw=rawData;
		currentData.binaryString=binaryString;
		currentData.mimeType=guessMimeType(binaryString) || (isASCII? 'text/plain' : 'application/octet-stream');
		currentData.asciiString=isASCII;
		currentData.base64=base64;

		/* refresh HTML elements */
		document.getElementById('input-file').value='';
		refreshFilePreview();
		if(currentData.asciiString){
			document.getElementById('textarea-ascii').value=currentData.binaryString;
			document.getElementById('radio-ascii').click();
			document.getElementById('textarea-ascii').focus();
			document.getElementById('textarea-ascii').select();
		}else{
			document.getElementById('textarea-ascii').value='';
			document.getElementById('radio-file').click();
			document.getElementById('btn-download').focus();
		}
		return setStatusMessage(_('Decoded from Base64'), true);
	}catch(err){
		return setStatusMessage('Unable to decode from Base64: '+err.message, false);
	}
}


function prettySize(size){
    if(size<1024){
        return size+' <small>B</small>';
    }else if(size<1024 * 1024){
        return parseFloat((size/1024).toFixed(2))+' <small>KB</small>';
    }else{
        return parseFloat((size / (1024*1024)).toFixed(2))+' <small>MB</small>';
    }
}
function refreshFilePreview(){
	while(document.getElementById('container-preview').children.length>1)
		document.getElementById('container-preview').removeChild(document.getElementById('container-preview').children[1]);

	const isImage=/^image\//.test(currentData.mimeType);
	if(isImage){
		const img=new Image();
		img.src='data:'+currentData.mimeType+';base64,'+currentData.base64;
		document.getElementById('container-preview').appendChild(img);
		if(/svg\+xml$/.test(currentData.mimeType))
			document.getElementById('container-preview').className='image image-svg';
		else
			document.getElementById('container-preview').className='image';
	}else{
		const pre=document.createElement('pre');
		pre.className='mono';
		pre.innerHTML='';
		for(var i=0; i<224 && i<currentData.raw.length; i++){
			const hex=currentData.raw[i]<=10? '0'+currentData.raw[i].toString(16) : currentData.raw[i].toString(16);
			if(i)
				pre.innerHTML+=(i%16 === 0? '\n' : ' ')
			pre.innerHTML+=hex;
		}
		document.getElementById('container-preview').appendChild(pre);
		document.getElementById('container-preview').className='hex';
	}

	document.getElementById('span-size-original').innerHTML=prettySize(currentData.raw.length);
	document.getElementById('span-size-base64').innerHTML=prettySize(currentData.base64.length);
	document.getElementById('span-size-original').title=currentData.raw.length > 1024? currentData.raw.length + ' B' : '';
	document.getElementById('span-size-base64').title=currentData.base64.length > 1024? currentData.base64.length + ' B' : '';
	document.getElementById('span-data-prefix').innerHTML='data:'+currentData.mimeType+';base64,';

	document.getElementById('overlay-upload').className='';

	document.getElementById('btn-download').disabled=false;
	document.getElementById('btn-clipboard').disabled=false;
}
function refreshInputContainer(){
	document.getElementById('container-ascii').style.display=document.getElementById('radio-ascii').checked? 'block' : 'none';
	document.getElementById('container-file').style.display=document.getElementById('radio-file').checked? 'block' : 'none';
}

var messageTimer;
function setStatusMessage(message, success){
	if(messageTimer)
		window.clearTimeout(messageTimer);

	document.getElementById('status-message').innerHTML=message;
	document.getElementById('status-message').className='show '+(success? 'success' : 'error');
	
	messageTimer=window.setTimeout(function(){
		document.getElementById('status-message').className=document.getElementById('status-message').className.replace('show','hide');
	}, success? 1000 : 3000);

	return success;
}
window.addEventListener('load', function(evt){
	/* UI events */
	document.getElementById('radio-ascii').addEventListener('change', refreshInputContainer);
	document.getElementById('radio-file').addEventListener('change', refreshInputContainer);

	document.getElementById('textarea-ascii').addEventListener('paste', function(evt){
		const pastedText=evt.clipboardData.getData('text').trim();
		if(pastedText && /^(data:image\/svg\+xml,)?%3Csvg/.test(pastedText) && this.value===''){
			evt.preventDefault();
			this.value=window.decodeURIComponent(pastedText.replace(/ /g, '%20').replace(/^data:image\/svg\+xml,/, ''));
			importString(evt);
		}
	});
	document.getElementById('textarea-ascii').addEventListener('change', importString);
	document.getElementById('btn-clipboard-uri').addEventListener('click', async function(evt){
		try{
			const textToCopy='data:image/svg+xml,'+window.encodeURIComponent(document.getElementById('textarea-ascii').value).replace(/%20/g, ' ').replace(/%22/g, '\"');
			await navigator.clipboard.writeText(textToCopy);
			return setStatusMessage(_('Copied to clipboard'), true);
		}catch(err){
			return setStatusMessage('Copy to clipboard failed: '+ err, true);
		}
	});
	document.getElementById('input-file').addEventListener('change', function(evt){
		if(this.files && this.files.length){
			fileReaderMimeType=this.files[0].type || 'application/octet-stream';
			fileReader.readAsBinaryString(this.files[0]);
		}
	});
	document.getElementById('container-preview').addEventListener('click', function(evt){
		document.getElementById('input-file').click();
	});

	document.getElementById('textarea-base64').addEventListener('change', fromBase64);
	document.getElementById('btn-clipboard').addEventListener('click', async function(evt){
		try{
			const textToCopy=currentData.base64;
			await navigator.clipboard.writeText(textToCopy);
			return setStatusMessage(_('Copied to clipboard'), true);
		}catch(err){
			return setStatusMessage('Copy to clipboard failed: '+ err, true);
		}
	});

	document.getElementById('btn-download').addEventListener('click', downloadFile);

	document.addEventListener('paste', function(evt){
		const items=(event.clipboardData || event.originalEvent.clipboardData).items;

		for(var i=0; i<items.length; i++) {
			if(items[i].type.indexOf('image')===0){
				document.getElementById('radio-file').click();
				const blob=items[i].getAsFile();
				fileReaderMimeType=items[i].type;
				fileReader.readAsBinaryString(blob);
				break;
			}
		}
	});


	/* translate UI */
	document.querySelectorAll('*[data-translate]').forEach(function(elem){
		const translate=elem.getAttribute('data-translate');
		if(translate==='placeholder')
			elem.placeholder=_(elem.placeholder);
		else
			elem.innerHTML=_(elem.innerHTML);
	});

	/* initialize */
	refreshInputContainer();
	if(document.getElementById('textarea-ascii').value)
		importString();
	else if(document.getElementById('textarea-base64').value)
		fromBase64();
});