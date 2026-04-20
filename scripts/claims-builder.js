
/* ***************************************************** */
/* SNAKS HELPERS *************************************** */
function snak_item(property, qid) {
  return {
    snaktype: "value",
    property: property,
    datavalue: {
      type: "wikibase-entityid",
      value: {
        "entity-type": "item",
        "numeric-id": parseInt(qid.slice(1), 10), // drop leading "Q"
      },
    },
  };
}

function snak_time(property, date) {
  // Convert to UTC and format as +YYYY-MM-DDT00:00:00Z (precision day)
  const utc = new Date(date).toISOString().split("T")[0]; // YYYY-MM-DD
  return {
    snaktype: "value",
    property: property,
    datavalue: {
      type: "time",
      value: {
        time: `+${utc}T00:00:00Z`,
        precision: 11,
        timezone: 0,
        before: 0,
        after: 0,
        calendarmodel: "http://www.wikidata.org/entity/Q1985727",
      },
    },
  };
}

function snak_quantity(property, number, unit_qid) {
  return {
    snaktype: "value",
    property: property,
    datavalue: {
      type: "quantity",
      value: {
        amount: String(number),
        unit: `http://www.wikidata.org/entity/${unit_qid}`,
      },
    },
  };
}

function snak_mono(property, text, { iso = "en" } = {}) {
  return {
    snaktype: "value",
    property: property,
    datavalue: {
      type: "monolingualtext",
      value: {
        text: text,
        language: iso,
      },
    },
  };
}

function snak_string(property, string) {
  return {
    snaktype: "value",
    property: property,
    datavalue: {
      type: "string",
      value: string,
    },
  };
}
/* ***************************************************** */
/* CLAIMS ********************************************** */
var buildClaims = function (languagesByQids, fileInfo) {
  let language = languagesByQids[fileInfo.filename.P407];
  console.log("LanguagesByQids  for", fileInfo.filename.P407, ":", languagesByQids[fileInfo.filename.P407]);
  let languageCode = language.iso639_1 || language.iso639_3 || "mis",
      entity = fileInfo.entity;
  const claimsToAdd = [],
        claimsToAddSummary = [];
  let data = '';
  if(entity.statements) {

    // copyright status of recording
    if (!entity.statements.P6216) {
      claimsToAddSummary.push({'P6216': "Q88088423 `copyrighted`"});
      claimsToAdd.push({
        mainsnak: snak_item("P6216", "Q88088423"),
        type: "statement",
        rank: "normal",
      });
    }

    /* copyright license
    if (!entity.statements.P275) {
      claimsToAdd.push({
        mainsnak: snak_item("P275", recording.batch.locutor.license),
        type: "statement",
        rank: "normal",
      });
    } */

    // P31 - instance of: pronunciation
    if (!entity.statements.P31) {
      claimsToAddSummary.push({'P31': fileInfo.filename.P31 + ' `pronunciation`'});
      claimsToAdd.push({
        mainsnak: snak_item("P31", fileInfo.filename.P31),
        type: "statement",
        rank: "normal",
      });
    }

    // P407 - language of work
    if (!entity.statements.P407) {
      claimsToAddSummary.push({'P407': fileInfo.filename.P407 + ' `language`'});
      claimsToAdd.push({
        mainsnak: snak_item("P407", fileInfo.filename.P407),
        type: "statement",
        rank: "normal",
      });
    } else {
      // Check if existing value differs from filename
      const existingP407 = entity.statements.P407[0].mainsnak.datavalue.value.id;
      if (existingP407 !== fileInfo.filename.P407) {
        console.warn(`P407 mismatch: SDC has ${existingP407}, filename has ${fileInfo.filename.P407}. Replacing...`);
        claimsToAddSummary.push({'P407': `${existingP407} -> ${fileInfo.filename.P407} 'language' (replaced)`});
        // Remove old claim
        claimsToAdd.push({
          id: entity.statements.P407[0].id,
          remove: true
        });
        // Add new claim
        claimsToAdd.push({
          mainsnak: snak_item("P407", fileInfo.filename.P407),
          type: "statement",
          rank: "normal",
        });
      }
    }

    // P9533 - transcription
    if (!entity.statements.P9533) {
      claimsToAddSummary.push({'P9533': fileInfo.filename.P9533 + ' `transcription`'});
      claimsToAdd.push({
        mainsnak: snak_mono("P9533", fileInfo.filename.P9533, { iso: languageCode }),
        type: "statement",
        rank: "normal",
      });
    }

    // data size
    if (!entity.statements.P3575) {
      // const SIZE_BYTES = fs.statSync(FILE_PATH).size;
      const SIZE_BYTES = fileInfo.page.imageinfo[0].size;
      claimsToAddSummary.push({'P3575': SIZE_BYTES + ' `bytes`'});
      claimsToAdd.push({
        mainsnak: snak_quantity("P3575", SIZE_BYTES, "Q8799"),
        type: "statement",
        rank: "normal",
      });
    }

    // duration
    if (!entity.statements.P3575) {
      // const duration = get_duration_seconds(FILE_PATH);
      const duration = fileInfo.page.imageinfo[0].duration;
      claimsToAddSummary.push({'P2047': duration + ' `seconds`'});
      claimsToAdd.push({
        mainsnak: snak_quantity("P2047", Math.round(duration * 1e5) / 1e5, "Q11574"),
        type: "statement",
        rank: "normal",
      });
    }

    // P1163 - media type (MIME)
    if (!entity.statements.P1163) {
      claimsToAddSummary.push({'P1163': fileInfo.filename.P1163 + ' `MIME type`'});
      claimsToAdd.push({
        mainsnak: snak_string("P1163", fileInfo.filename.P1163),
        type: "statement",
        rank: "normal",
      });
    }

    /* checksum (value + qualifier "determination method = SHA-1/SHA-256")
    if (!entity.statements.P4092) {
      claimsToAdd.push({
        mainsnak: snak_string("P4092", recording.file_hash),
        type: "statement",
        qualifiers: {
          P459: [snak_item("P459", "Q110651361")], // determination method → SHA-256
        },
        rank: "normal",
      });
    } */

    // P10135 - recording date
    if (!entity.statements.P10135) {
      claimsToAddSummary.push({'P10135': fileInfo.api.uploadDateFormatted + ' `recording date`'});
      claimsToAdd.push({
        mainsnak: snak_time("P10135", fileInfo.api.uploadDateFormatted ),
        type: "statement",
        rank: "normal",
      });
    }

    // P10893 - recordist
    if (!entity.statements.P10893) {
      claimsToAddSummary.push({'P10893': fileInfo.filename.P10893 + ' `recordist`'});
      claimsToAdd.push({
        mainsnak: {
          snaktype: "somevalue",
          property: "P10893",
        },
        type: "statement",
        rank: "normal",
        qualifiers: {
          P4174: [snak_string("P4174", fileInfo.filename.P10893)],
        },
      });
    }

    // P10894 - spoken by
    if (!entity.statements.P10894) {
      claimsToAddSummary.push({'P10894': fileInfo.filename.P10894 + ' `speaker`'});
      claimsToAdd.push({
          mainsnak: {
            snaktype: "somevalue",
            property: "P10894",
          },
          type: "statement",
          rank: "normal",
          qualifiers: {
            P2093: [snak_string("P2093", fileInfo.filename.P10894)],
          },
      });
    }    
    /* depicts (P180) — optional
    if (recording.qid && !entity.statements.P180) {
      claimsToAddSummary.push({'P10894': fileInfo.filename.P10894 + ' `speaker`'});
      claimsToAdd.push({
        mainsnak: snak_item("P180", recording.qid),
        type: "statement",
        rank: "normal",
      });
    } */
    
    // Log what claims are being added
    if (claimsToAdd.length > 0) {
      console.log(`Adding ${claimsToAdd.length} missing claims:`);
    }
  }
  data = JSON.stringify({ claimsToAdd });
  return { data, claimsToAddSummary } ;
}
// Export functions
export { buildClaims };