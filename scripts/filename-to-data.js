const sampleFilenames = [
{ filename: "File:LL-Q150 (fra)-Yug-cimetière de Saint-Justin (a proximité du Château de Fondat).wav", uploader: 'Yug' },
{ filename: "File:LL-Q150 (fra)-Yug-Elena Poniatowska.wav", uploader: 'Yug' },
{ filename: "File:LL-Q12473479 (tes)-Hariati (Heni say)-buyut.wav", uploader: 'Heni say' },
{ filename: "File:LL-Q12473479 (tes)-Hariati (Heni say)-wedok.wav", uploader: 'Heni say' },
{ filename: "File:LL-Q12473479 (tes)-Hariati (Antya Anantari)-lek.wav", uploader: 'Antya Anantari' },
{ filename: "File:LL-Q12473479 (tes)-Hariati (Akhmadraflii)-bebek.wav", uploader: 'Akhmadraflii' },
{ filename: "File:LL-Q12473479 (tes)-Hariati (Nada Auliya)-randa.wav", uploader: 'Nada Auliya' },
{ filename: "File:LL-Q12473479 (tes)-Erdin Pratama (Empat Tilda)-Sira kok ana kene pisan?.wav", uploader: 'Empat Tilda' },
{ filename: "File:LL-Q6388963 (knx)-Benediktus Ryan-tua'.wav", uploader: 'Benediktus Ryan' },
{ filename: "File:LL-Q6388963 (knx)-Benediktus Ryan-buah.wav", uploader: 'Benediktus Ryan' },
{ filename: "File:LL-Q6388963 (knx)-Benediktus Ryan-tangke'.wav", uploader: 'Benediktus Ryan' },
{ filename: "File:LL-Q12473479 (tes)-Eko Warnoto (Maulana Fardan Alhamdi)-oyoh.wav", uploader: 'Maulana Fardan Alhamdi' },
{ filename: "File:LL-Q12473479 (tes)-Eko Warnoto (Maulana Fardan Alhamdi)-jantung.wav", uploader: 'Maulana Fardan Alhamdi' },
{ filename: "File:LL-Q12473479 (tes)-Eko Warnoto (Intannx6424)-gulu.wav", uploader: 'Intannx6424' },
{ filename: "File:LL-Q12473479 (tes)-Eko Warnoto (Sizzling Tea)-geger (bird).wav", uploader: 'Sizzling Tea' },
{ filename: "File:LL-Q12473479 (tes)-Eko Warnoto (Sizzling Tea)-belung.wav", uploader: 'Sizzling Tea' },
{ filename: "File:LL-Q12473479 (tes)-Eko Warnoto (Sizzling Tea)-Tikus takon nang manuk.wav", uploader: 'Sizzling Tea' },
];

// Function to get file information from Commons API
async function getFileInfo(filename) {
    const title = filename.startsWith('File:') ? filename : `File:${filename}`;
    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&prop=contributors|imageinfo|pageprops&titles=${encodeURIComponent(title)}&iiprop=user|size|mime|timestamp|metadata&formatversion=2&format=json`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    const imageInfo = data.query.pages[0].imageinfo[0];
    
    return {
        filename: title,
        mediaId: 'M'+data.query.pages[0].pageid,
        uploader: imageInfo.user,
        uploadDate: imageInfo.timestamp,
        uploadDateFormatted: new Date(imageInfo.timestamp).toISOString().split('T')[0]
    };
}


let filenameToProperties = function (filename,uploader,date = "") {

    // Extract language code from filename
    // Example filename: "File:LL-Q150 (fra)-Merlin (Yug)-yellow_potato.wav"
    // Handle both spaces and underscores: "LL-Q150 (fra)" or "LL-Q150_(fra)"
    const langQid = filename.match(/LL-(Q\d+)[_\s]*\(\w+\)/)[1],
        langIso = filename.match(/LL-Q\d+[_\s]*\((\w+)\)/)[1],
        authorsAndWord = filename
            .replace(/File:LL-(Q\d+)[_\s]*\(\w+\)/g,'')
            .replace('.wav','')
            .split(uploader),
        media_type= filename.match(/.wav$/)? "audio/wav" : ' video/webm';
    
    const speaker = authorsAndWord[1] === '-' ? 
            uploader
            :authorsAndWord[0].replace(/^-/,'').replace(/[_\s]\($/,'') || uploader,
        word = authorsAndWord[1][0] === ')' ? 
            authorsAndWord[1].replace(/^\)-/, '')
            :authorsAndWord[1].replace(/^-/, ''),
        qualifier = filename.includes(').wav')?
          filename.match(/\((.+)\).wav/)[1].replace(/^.+\(/,'') :null;

    // Map language code to Wikidata QID (this is a sample mapping, extend as needed)
    return {   
        'P31': 'Q108167708',   // instance of : pronunciation Q108167708
        'P407': langQid,       // language of work
        'P9533': word,         // transcription
          'iso639_3': langIso, // iso639-3 code, to qualify the language if P9533
        'P10893': uploader,    // recordist
        'P10894': speaker,     // spoken by
        'P10135': date,        // recording date
        'P1163': media_type,
        'qualifier': qualifier 
    }
}

let propertiesToFilename = function(properties, languagesByQids) {
    // Get language ISO code from QID
    const langQid = properties.P407;
    const language = languagesByQids[langQid];
    const langIso = language?.iso639_3 || language?.iso639_1 || 'mis';
    
    // Determine file extension based on media type
    const extension = properties.P1163 === 'audio/wav' ? '.wav' : '.webm';
    
    // Build the speaker part
    // If speaker is same as uploader, use just uploader name with dash
    // Otherwise, use "speaker (uploader)" format
    let speakerPart;
    if (properties.P10894 === properties.P10893) {
        speakerPart = `-${properties.P10893}`;
    } else {
        speakerPart = `-${properties.P10894} (${properties.P10893})`;
    }
    
    // Build the word part
    let wordPart = `-${properties.P9533}`;
    if (properties.qualifier) {
        wordPart = wordPart + ` (${properties.qualifier})`;
    }
    
    // Construct the full filename
    const filename = `LL-${langQid} (${langIso})${speakerPart}${wordPart}${extension}`.replace(/\s+/g, '_');
    
    return filename;
}

// Export functions
export { getFileInfo, filenameToProperties, propertiesToFilename, sampleFilenames };