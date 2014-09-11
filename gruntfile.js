var path = require('path');

module.exports = function(grunt) {

  grunt.initConfig({
    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'scss',
          src: ['*.scss'],
          dest: 'public/css',
          ext: '.css',
          update: true
        }]
      },
    },
    watch: {
      source: {
        files: ['scss/*.scss'],
        tasks: ['sass:dist'],
        options: {
          livereload: true
          //spawn: false
        }
      }
    }
  });
/*
  grunt.event.on('watch', function(action, src, target) {
    var dest = 'public/css/' + path.basename(src, '.scss') + '.css';
    var sass_config = {}

    // create appropriate sass rule on the fly (task 'sass' gets to run after this)
    sass_config[dest] = src;
    grunt.config('sass.once.files', sass_config);
  });
*/
  grunt.registerTask('default', ['sass']);
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

};
