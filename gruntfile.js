module.exports = function (grunt) {

  grunt.initConfig({
    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'css',
          src: ['*.scss'],
          dest: 'public/css',
          ext: '.css'
        }]
      }
    },
    watch: {
      source: {
        files: ['css/*.scss'],
        tasks: ['sass'],
        options: {
          livereload: true,
        }
      }
    }
  });

  //grunt.registerTask('default', ['sass']);
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

};
