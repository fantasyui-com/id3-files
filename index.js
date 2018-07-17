// const fs = require('fs');
const path = require('path');
const glob = require('glob');
const kebabCase = require('lodash/kebabCase');
const padStart = require('lodash/padStart');
const program = require('commander');
const mm = require('music-metadata');
const sort = require('alphanum-sort');
const shortid = require('shortid');
const fs = require('fs-extra')
const home = require('home');
const sha = require('sha');
const chalk = require('chalk');


const cid = new Set();

program
  .version('0.1.0')
  .arguments('<dir> [dirs...]')

  .option('-f, --use-fingerprinting', 'fingerprint files with sha to avoid copies.')

  .option('--title', 'Just use album+title in a single dir.')
  .option('--artist-title', 'Use artist/album+title in a two dir configuration')
  .option('--artist-album-title', 'Use artist/album/title in three dir configuration.')

  .option('-l, --music-library [dir]', 'Path to music library', '~/music-db')

  .option('-d, --dry-run', 'Dry run, just print file names.')
  .action(function (dir, dirs) {
     dirValues = [dir];
     if (dirs) {
       dirValues = dirValues.concat(dirs);
     }
  });

program.parse(process.argv);

program.musicLibrary = home.resolve(program.musicLibrary);


if ( (typeof dirValues === 'undefined') || (dirValues.length === 0) ) {
   console.error('no dir[s] given!');
   process.exit(1);
}
console.log(dirValues);

let readData = function({location}){
  return new Promise(function (resolve, reject){
    mm.parseFile(location, {native: true}).then(function(data){
      //setTimeout(function(){
        resolve( data );
      //}, 1000);
    });
  })
};


scan(dirValues);

function scan (dirs){

  let files = [];
  dirs.forEach(dir => {

    console.info(`Scanning source directory ${dir}...`)
    files = files.concat(
      glob.sync( "**/*", {realpath:true, nodir:true, cwd:dir} )
      .filter(i=>fs.statSync(i).isFile() ) // strip dot files
      .filter(i=>!i.match(/^\./)) // strip dot files
      .filter(i=>i.match(/\.mp3$/)) // match mp3 only
      .map( i => ({ // create object
        location:i,
        name: kebabCase(path.basename(i, path.extname(i))) + path.extname(i)
      })))
    console.info(`Found ${files.length} mp3 file${files.length>1?'s':''} in ${dir}`);
  });

  if(program.useFingerprinting){
  console.info(`Fingerprinting a total of ${files.length} mp3 file${files.length>1?'s':''}...`)

  files.forEach( (file, index )=>{
    let number = index + 1;
    process.stdout.write(`${number}/${files.length}`);
    file.sha = sha.getSync(file.location);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  });

    let entries = [];
    files.forEach( file => {
      if( cid.has(file.sha) ){
        console.info('Skipped: [%s]', file.location)
      }else{
         entries.push(file)
         cid.add(file.sha);
      }
    });
    doit(entries);
  }else{
    doit(files);
  }

} // scan

function doit (entries){

    let root = Promise.resolve();

  entries.forEach((entry, index) => {

    root = root.then(i=>readData(entry).then(function(data){

        let number = index + 1;
        console.log(`Processing ${number}/${entries.length}: ${entry.location}`);


          const oldName = entry.location;
          let newName = "";

          let album  = data.common.album || 'Various';
          let artist = data.common.artist || data.common.artist || data.common.albumartist || (data.common.artists||[]).join(", ") || 'Unknown';
          let title  = data.common.title || 'Untitled Song' + ' ' + shortid.generate();

          album = album.trim();
          artist = artist.trim();
          title = title.trim();

          album = kebabCase(album);
          artist = kebabCase(artist);
          title = kebabCase(title);

          if(artist === 'various') artist = album;

          const ext = path.extname(entry.location);

          if(program.title){
            const dirname = path.join(program.musicLibrary);
            const filename = album + '--' + title + ext;
            newName = path.join(dirname, filename);
          } else if(program.artistTitle){
            const dirname = path.join(program.musicLibrary, artist);
            const filename = album + '--' + title + ext;
            newName = path.join(dirname, filename);
          } else if(program.artistAlbumTitle){
            const dirname = path.join(program.musicLibrary, artist, album);
            const filename = title + ext;
            newName = path.join(dirname, filename);
          }else{
            const dirname = path.join(program.musicLibrary, artist);
            const filename = album + '--' + title + ext;
            newName = path.join(dirname, filename);
          }

          if(program.dryRun){
            // console.log( "%s\n%s\n\n", oldName, newName )
             console.log( "%s -> %s", chalk.red(oldName), chalk.green(newName) )
          } else if(program.moveFiles){
            //  fs.ensureDirSync( path.dirname( newName ) );
            //  fs.renameSync( oldName, newName );
          }else{
            fs.ensureDirSync( path.dirname( newName ) );
            fs.copySync( oldName, newName );
          }




    }) // read data
  ) // root.then

  }) // forEach

  root.then(function(){
    console.log('Finished...');
  })

} // doit
