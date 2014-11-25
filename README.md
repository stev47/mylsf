# mylsf


## Goal

This this project aims to be a better alternative to
[HIS/LSF](https://lsf.uni-stuttgart.de) at the University of Stuttgart for
viewing lecture data and planning your timetable.

Eventually one would like to have more functionality (e.g. “I'm currently in
building A and have free time, which lectures are available for me to peek
into?”), the possibilities are endless.


## Overview

The project can be seen as two separate parts: a backend and a frontend.

### Backend

The backend constist of a web crawler (harvester) for retrieving real world
data and defines a data format to be used for database storage.

The most important parts of the backend are working already.

### Frontend

The frontend uses the stored data to deliver a full web user experience.

Almost everything remains to be done.


## Getting started


You'll need

 - nodejs/npm
 - mongodb
 - `grunt` in your path (e.g. `npm install -g grunt` or through pkgs)
 - `sass` in your path (e.g. install `ruby` and run `gem install sass` or through pkgs)

Proceed by doing something like

0. `cd` to this projects directory
1. `npm install` to install dependencies
2. `grunt sass` to compile stylesheets
3. Make sure mongodb server is started and listening on default port 27017
4. Run `node ./import.js [-v] <command>` using a command from the following list
   (it's probably wise to run these commands in the following order):
    - `courseList` to import course id's
    - `courseData` to import actual course data (one web-crawl per id)
    - `moduleList` same …
    - `moduleData` same …
    - `lectureList` same …
    - `lectureData` same …
    - `locationData` to import location data for locations referenced by lectures
    - `courseDrop`, `moduleDrop`, `lectureDrop` to wipe your data
5. Run `node ./index.js` to start a webserver on port 3000 and navigate to http://localhost:3000



