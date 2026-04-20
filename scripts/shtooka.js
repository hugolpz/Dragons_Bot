
/* ************************************************************************** /
# Download all from Shtooka with identical structure
$ wget -r -np -nc -nH --accept=.flac,.html -A .flac,.html https://packs.shtooka.net/ --no-check-certificate
FINISHED --2024-01-03 14:06:55--
Total wall clock time: 1h 26m 49s
Downloaded: 114574 files, 7.9G in 21m 56s (6.14 MB/s)
# Keep only flac files
mkdir flacs
mv ./** /.*.flac ./flacs
/* ************************************************************************* */


const { execSync } = require('child_process');

let commandToOutput = function(command){ 
    // console.log({ command })
    var commandOutput;
    try {
        // The output of the command is returned by execSync
        commandOutput = execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
        console.error(`Error executing command: ${error.message}`);
    }
    // console.log({ commandOutput })
    // The output of the command is available in the 'stdout' variable
    return commandOutput;
}

/* ************************************************************************* */

let ffmpeg = function(filepath) { 
    return `ffprobe -hide_banner ${filepath} 2>&1 `;
};
let sed = function(type){
    return `sed -ne 's/^\\s*${type}\\s*: //p'`;
}


let fitter = function(str,type=undefined){
    let val = '';
    switch(true) {
        // Language
        case str.includes("cmn")        :                        // SWAC_LANG 
        case str.includes("zho")        : val = 'Q9192'; break;  // SWAC_SPEAK_LANG 
        // Voice
        case str=="F"                   : val = 'female'; break;       // SWAC_SPEAK_GENDER
        case str=="M"                   : val = 'male'; break;         // SWAC_SPEAK_GENDER
        case str.includes("Liaoning")   : val = 'Q1247664'; break;     // SWAC_SPEAK_LANG_REGION
        case str.includes("(c) 2009 Yue Tan"): val = 'Yue Tan'; break; // COPYRIGHT
        case str.includes("Tan")        : val = 'Q1247664'; break;     // ARTIST
        // Licences. See [[:c:Commons:List_of_primary_license_tags]].
        case str.includes("BY-SA 3.0")  : val = `{{cc-by-sa-3.0}}`; break; // LICENSE
        case str.includes("BY-SA 4.0")  :
        case str.includes("BY-SA")      : val = `{{cc-by-sa-4.0}}`; break;
        case str.includes("BY 3.0")     : val = `{{cc-by-3.0}}`; break;
        case str.includes("BY 4.0")     :
        case str.includes("BY")         : val = `{{cc-by-4.0}}`; break;
        case str.includes("Zero")       :
        case str.includes("PD")         :
        case str.includes("Public")     : val = `{{cc-zero}}`; break;  
        // Categories
        case str.includes("HSK niveau IV")     : val = `[[Category:HSK 4 (2008)]]`; break;  

        // SWAC_SPEAK_LIV_COUNTRY: FR
    }
    switch(type){
        case "COPYRIGHT": val = str.replace(/(\(c\))? ?\d+\s*/g,''); break; 
        case "SWAC_COLL_COPYRIGHT": val = str.replace(/(\(c\))? ?\d+\s*/g,''); break;
        default: val = val;
    }
    return val;
}

var getMetadata = function(filepath) {
    command = ffmpeg(filepath) // print all metadata
    return commandToOutput(command);
}

var getMetaVal = function(metadataTEXT,type) {
    command = `echo "${metadataTEXT.replace(/__/g,'')}" | ` + sed(type);
    return commandToOutput(command);
}





let uploadTemplate = function(metadataText){
    return `== {{int:filedesc}} ==
{{Lingua Libre record
    | speaker       = ${fitter(getMetaVal(metadataText,'SWAC_COLL_COPYRIGHT'))}
    | speakerId     = ${fitter(getMetaVal(metadataText,'ARTIST'))}
    | speakerGender = ${fitter(getMetaVal(metadataText,'SWAC_SPEAK_GENDER'))}
    | author        = [[User:Dragons_Bot|Dragons Bot]]
    | languageId    = ${fitter(getMetaVal(metadataText,'SWAC_SPEAK_LANG'))}
    | transcription = ${getMetaVal(metadataText,'SWAC_TEXT')}
    | qualifier     = 
    | date          = ${getMetaVal(metadataText,'SWAC_TECH_DATE')}
}}` +
//  | TITLE                    = ${getMetaVal(metadataText,'TITLE')}`                    + /* 高低 */ `
//  | LICENSE                  = ${getMetaVal(metadataText,'LICENSE')}`                  + /* * Creative Commons BY-SA 3.0 U.S */ `
//  | COPYRIGHT                = ${getMetaVal(metadataText,'COPYRIGHT')}`                + /* * (c) 2009 Yue Tan */ `
//  | ARTIST                   = ${getMetaVal(metadataText,'ARTIST')}`                   + /* * Tan */ `
//  | DATE                     = ${getMetaVal(metadataText,'DATE')}`                     + /* * 2009-07-08 */ `
//  | GENRE                    = ${getMetaVal(metadataText,'GENRE')}`                    + /* * Speech */ `
// 
//  | SWAC_LANG                = ${getMetaVal(metadataText,'SWAC_LANG')}`                + /* cmn */ `
//  | SWAC_TEXT                = ${getMetaVal(metadataText,'SWAC_TEXT')}`                + /* 高低 */ `
//  | SWAC_ALPHAIDX            = ${getMetaVal(metadataText,'SWAC_ALPHAIDX')}`            + /* * gāodī */ `
//  | SWAC_SPEAK_NAME          = ${getMetaVal(metadataText,'SWAC_SPEAK_NAME')}`          + /* Tan */ `
//  | SWAC_SPEAK_GENDER        = ${getMetaVal(metadataText,'SWAC_SPEAK_GENDER')}`        + /* F */ `
//  | SWAC_SPEAK_BIRTH_YEAR    = ${getMetaVal(metadataText,'SWAC_SPEAK_BIRTH_YEAR')}`    + /* * 1978 */ `
//  | SWAC_SPEAK_LANG          = ${getMetaVal(metadataText,'SWAC_SPEAK_LANG')}`          + /* zho */ `
//  | SWAC_SPEAK_LANG_REGION   = ${getMetaVal(metadataText,'SWAC_SPEAK_LANG_REGION')}`   + /* Liaoning */ `
//  | SWAC_SPEAK_LIV_COUNTRY   = ${getMetaVal(metadataText,'SWAC_SPEAK_LIV_COUNTRY')}`   + /* * FR */ `
//  | SWAC_SPEAK_LIV_TOWN      = ${getMetaVal(metadataText,'SWAC_SPEAK_LIV_TOWN')}`      + /* * Caen */ `
//  | SWAC_PRON_PHON           = ${getMetaVal(metadataText,'SWAC_PRON_PHON')}`           + /* gāodī */ `
//  | SWAC_COLL_SECTION        = ${getMetaVal(metadataText,'SWAC_COLL_SECTION')}`        + /* * HSK niveau IV */ `
//  | SWAC_COLL_LICENSE        = ${getMetaVal(metadataText,'SWAC_COLL_LICENSE')}`        + /* Creative Commons BY-SA 3.0 U.S */ `
//  | SWAC_COLL_COPYRIGHT      = ${getMetaVal(metadataText,'SWAC_COLL_COPYRIGHT')}`      + /* (c) 2009 Yue Tan */ `
//  | SWAC_TECH_DATE           = ${getMetaVal(metadataText,'SWAC_TECH_DATE')}`           + /* 2009-07-08 */ `
//  | SWAC_TECH_SOFT           = ${getMetaVal(metadataText,'SWAC_TECH_SOFT')}`           + /* Shtooka Recorder/1.3 */ 
`

== {{int:license-header}} ==
${fitter(getMetaVal(metadataText,'SWAC_COLL_LICENSE'))}`
}

var uploadFilename = function(metadataText,extension){
    // File:LL-Q2501174 (gor)-Supardisahabu-biihu.wav
    var wd = fitter(getMetaVal(metadataText,'SWAC_SPEAK_LANG')),
        iso= getMetaVal(metadataText,'SWAC_LANG') || 'mis',
        voice= fitter(getMetaVal(metadataText,'COPYRIGHT')),
        title= getMetaVal(metadataText,'TITLE'),
        ext= extension || '.wav';
    return `LL-${wd} (${iso})-${voice}-${title}${ext}`
}


module.exports = {
    getMetadata: getMetadata,    
    getMetaVal: getMetaVal,
    uploadTemplate: uploadTemplate,
    uploadFilename: uploadFilename,    
  };


/* ************************************************************************** /
/* ********************** TEMPALTE BUILDING ********************************* /
/* ************************************************************************** /
$ ffprobe -hide_banner ./media/cmn-0a0a8a8b.ogg
Input #0, ogg, from './media/cmn-0a0a8a8b.ogg':
  Duration: 00:00:01.25, start: 0.000000, bitrate: 99 kb/s
  Stream #0:0: Audio: vorbis, 44100 Hz, mono, fltp, 80 kb/s
    Metadata:
      TITLE           : 高低
      LICENSE         : Creative Commons BY-SA 3.0 U.S
      COPYRIGHT       : (c) 2009 Yue Tan
      ARTIST          : Tan
      DATE            : 2009-07-08
      GENRE           : Speech
      SWAC_LANG       : cmn
      SWAC_TEXT       : 高低
      SWAC_ALPHAIDX   : gāodī
      SWAC_SPEAK_NAME : Tan
      SWAC_SPEAK_GENDER: F
      SWAC_SPEAK_BIRTH_YEAR: 1978
      SWAC_SPEAK_LANG : zho
      SWAC_SPEAK_LANG_REGION: Liaoning
      SWAC_SPEAK_LIV_COUNTRY: FR
      SWAC_SPEAK_LIV_TOWN: Caen
      SWAC_PRON_PHON  : gāodī
      SWAC_COLL_SECTION: HSK niveau IV
      SWAC_COLL_LICENSE: Creative Commons BY-SA 3.0 U.S
      SWAC_COLL_COPYRIGHT: (c) 2009 Yue Tan
      SWAC_TECH_DATE  : 2009-07-08
      SWAC_TECH_SOFT  : Shtooka Recorder/1.3

/* ************************************************************************** /
/* ************************************************************************** /
== {{int:filedesc}} ==
{{Lingua Libre record
 | speaker       = Philippe             <!-- SWAC_SPEAK_NAME ; SWAC_COLL_COPYRIGHT -->
 | speakerId     = Q1221892             <!-- [!] -->
 | speakerGender = male                 <!-- SWAC_SPEAK_GENDER -->
 | author        = [[User:Yug|Yug]]     <!-- Dragons_Bot-->
 | languageId    = Q117707514           <!-- [!] <- SWAC_SPEAK_LANG -->
 | transcription = adiu                 <!-- TITLE -->
 | qualifier     = 
 | date          = 2023-12-15           <!-- DATE -->
}}

== {{int:filedesc}} ==
{{Lingua Libre record
 | locutor       = Aa087159
 | locutorId     = Q213443
 | locutorGender = female
 | author        = [[User:Aa087159|Aa087159]]
 | languageId    = Q9192
 | transcription = 语源
 | qualifier     = 
 | date          = 2019-11-14
}}

== {{int:license-header}} ==

{{cc-zero}}                             <!-- SWAC_COLL_LICENSE ; LICENSE -->

[[Category:Occitan whistled]]

/* ************************************************************************* */
