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

  .option('--title', 'Just use album+title in a single dir.')
  .option('--artist-title', 'Use artist/album+title in a two dir configuration')
  .option('--artist-album-title', 'Use artist/album/title in three dir configuration.')

  .option('-m, --music-library [dir]', 'Path to music library', '~/music-db')

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


let readData = async function({location}){
  return mm.parseFile(location, {native: true})
};

const main = async function({dir}){

  //
  let files = glob.sync( "**/*", {realpath:true, nodir:true, cwd:dir} )
  .filter(i=>fs.statSync(i).isFile() ) // strip dot files
  .filter(i=>!i.match(/^\./)) // strip dot files
  .filter(i=>i.match(/\.mp3$/)) // match mp3 only
  .map( i => ({ // create object
    sha: ""+sha.getSync(i),
    location:i,
    name: kebabCase(path.basename(i, path.extname(i))) + path.extname(i)
  }))

  let entries = [];

  files.forEach( file => {

    if( cid.has(file.sha) ){
       // do not use this
       // console.info('Skipped: [%s]', file.location)
    }else{
       entries.push(file)
       cid.add(file.sha);
    }
  });


  entries.forEach(async (entry, index) => {

    try {


      let data = await readData(entry);

      //console.log(data.common)
      const oldName = entry.location;

      let newName = "";

      //console.log(data)

      let album  = data.common.album || 'Various';
      let artist = data.common.artist || data.common.artist || albumartist || (artists||[]).join(", ") || 'Unknown';
      let title  = data.common.title || 'Untitled Song' + ' ' + shortid.generate();

      //console.log( album, artist, title, );

      album = album.trim();
      artist = artist.trim();
      title = title.trim();


      album = kebabCase(album);
      artist = kebabCase(artist);
      title = kebabCase(title);

      //console.log( album, artist, title, );

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

      //console.log( newName );

      // if(program.albumName){
      //   newName = path.join( dir, padStart(index+1, (files.length+"").length , '0') +'-'+ kebabCase(data.common.title||data.common.album) + path.extname(entry.location) );
      //
      // } else if(program.trackAlbumName){
      //   newName = path.join( dir, padStart(data.common.track.no, (files.length+"").length , '0') +'-'+ kebabCase(data.common.title||data.common.album) + path.extname(entry.location) );
      //
      // } else if(program.diskTrackAlbumName){
      //   newName = path.join( dir, padStart(data.common.disk.no, (files.length+"").length , '0') +'-'+ padStart(data.common.track.no, (files.length+"").length , '0') +'-'+ kebabCase(data.common.title||data.common.album) + path.extname(entry.location) );
      //
      // } else {
      //   if(!data.common.title) throw new Error('Missing Title')
      //   newName = path.join( dir, padStart(data.common.track.no, (files.length+"").length , '0') +'-'+ kebabCase(data.common.title||data.common.album) + path.extname(entry.location) );
      // }

      //console.log( "%s\n%s\n\n", oldName, newName )


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



    } catch(e){
      console.log(e)
    }

  });

} // main


dirValues.map(dir=>main({dir}))
