const fs = require('fs');
const path = require('path');
const kebabCase = require('lodash/kebabCase');
const padStart = require('lodash/padStart');
const program = require('commander');
const mm = require('music-metadata');
const sort = require('alphanum-sort');

program
  .version('0.1.0')
  .arguments('<dir> [dirs...]')
  .option('--album-name', 'Use album name + sorted number.')
  .option('--track-album-name', 'Use album name + track number.')
  .option('--disk-track-album-name', 'Use album name + track number.')

  .option('-d, --dry-run', 'Dry run, just print file names.')
  .action(function (dir, dirs) {
     dirValues = [dir];
     if (dirs) {
       dirValues = dirValues.concat(dirs);
     }
  });

program.parse(process.argv);

if ( (typeof dirValues === 'undefined') || (dirValues.length === 0) ) {
   console.error('no dir[s] given!');
   process.exit(1);
}


let readData = async function({location}){
  return mm.parseFile(location, {native: true})
};

const main = async function({dir}){

  //
  const files = sort(fs.readdirSync(dir))
  .filter(i=>!i.match(/^\./)) // strip dot files
  .map(i=>path.join(dir, i)) // combine filename and basename
  .map( i => ({ // create object
    location:i,
    name: kebabCase(path.basename(i, path.extname(i))) + path.extname(i)
  }))


  files.forEach(async (entry,index) => {

    try {

      let data = await readData(entry);
      //console.log(data.common)
      const oldName = entry.location;

      let newName = "";

      if(program.albumName){
        newName = path.join( dir, padStart(index+1, (files.length+"").length , '0') +'-'+ kebabCase(data.common.album) + path.extname(entry.location) );

      } else if(program.trackAlbumName){
        newName = path.join( dir, padStart(data.common.track.no, (files.length+"").length , '0') +'-'+ kebabCase(data.common.album) + path.extname(entry.location) );

      } else if(program.diskTrackAlbumName){
        newName = path.join( dir, padStart(data.common.disk.no, (files.length+"").length , '0') +'-'+ padStart(data.common.track.no, (files.length+"").length , '0') +'-'+ kebabCase(data.common.album) + path.extname(entry.location) );

      } else {
        if(!data.common.title) throw new Error('Missing Title')
        newName = path.join( dir, kebabCase(data.common.title) + path.extname(entry.location) );
      }


      if( oldName !== newName ) {
        if(program.dryRun){
          console.log( "%s\n%s\n", oldName, newName )
        }else{
          fs.renameSync( oldName, newName );
        }
      }
    } catch(e){

    }

  });

} // main


dirValues.map(dir=>main({dir}))
