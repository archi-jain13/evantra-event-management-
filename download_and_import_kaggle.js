/**
 * Automated Downloader & Importer for Real Events Dataset (Kaggle / OpenData)
 * Downloads thousands of real-world public events, concerts, festivals, parades, and cultural shows.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DATASET_URL = 'https://data.seattle.gov/api/views/dm95-f8w5/rows.csv?accessType=DOWNLOAD';
const OUTPUT_FILE = path.join(__dirname, 'kaggle_events.csv');

function downloadDataset() {
  console.log(`🌐 Downloading Kaggle/OpenData dataset from:`);
  console.log(`   ${DATASET_URL}`);
  console.log(`⏳ Please wait, fetching live CSV records...\n`);

  const file = fs.createWriteStream(OUTPUT_FILE);

  https.get(DATASET_URL, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      // Follow redirect
      https.get(response.headers.location, (redirectedResponse) => {
        redirectedResponse.pipe(file);
        file.on('finish', () => {
          file.close();
          onDownloadComplete();
        });
      }).on('error', handleError);
      return;
    }

    if (response.statusCode !== 200) {
      console.error(`❌ HTTP Error: Received status code ${response.statusCode}`);
      process.exit(1);
    }

    response.pipe(file);
    file.on('finish', () => {
      file.close();
      onDownloadComplete();
    });
  }).on('error', handleError);
}

function handleError(err) {
  fs.unlink(OUTPUT_FILE, () => {});
  console.error('❌ Download error:', err.message);
  console.log('\n💡 You can also manually download the CSV from Kaggle or Data.gov and run:');
  console.log('   node import_csv.js <downloaded_file.csv>');
  process.exit(1);
}

function onDownloadComplete() {
  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`✅ Download complete! File size: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`🚀 Now importing records into your Evantra database...\n`);

  // Run our universal CSV importer
  const result = spawnSync('node', ['import_csv.js', OUTPUT_FILE], {
    stdio: 'inherit',
    cwd: __dirname
  });

  if (result.status === 0) {
    console.log('\n✨ All events from the dataset have been successfully loaded into Evantra!');
  } else {
    console.error('❌ Import step encountered an issue.');
  }
}

downloadDataset();
