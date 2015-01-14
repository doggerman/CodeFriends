'use strict';
var Promise = require('bluebird');
var config = require('config');
var nodegit = require('nodegit');
var isGitUrl = require('is-git-url');
var path = require('path');
var wrench = Promise.promisifyAll(require('wrench'));
var rmdirAsync = Promise.promisify(require('rimraf'));
var filterIgnoredFiles = require('./uploadController').filterIgnoredFiles;
var addFileFromFileSytemToProject = require('./uploadController')._addFileFromFileSytemToProject;
var Q = require('q');
/**
 * Clone git repository and store it in the file system for later user
 *
 * @param <Object>/<Number/<String> Project model, id or name
 * @param <String> git repo url
 * @return <Object> return a nativeFileStructure
 */
var cloneGitRepositoryToProject = function (project, userId, gitRepoUrl) {
  if (typeof project !== 'object') throw new Error('project should be a model');
  if (!isGitUrl(gitRepoUrl)) throw new Error('URL provided is not a valid git repository URL');
  var gitRepoPath = path.resolve(__dirname, '../', config.get('gitRepositoriesDirectory'), '' + project.get('id'));
  return rmdirAsync(gitRepoPath)
    .then(function () {
      return nodegit.Clone.clone(gitRepoUrl, gitRepoPath, {ignoreCertErrors: 1})
        .then(function () {
          return wrench.readdirSyncRecursive(gitRepoPath);
        });
    })
    .then(function (_gitRepoPathContents) {
      // Filter files
      var gitRepoPathContents = filterIgnoredFiles(_gitRepoPathContents);
      // Add all files to project
      return gitRepoPathContents.reduce(function (soFar, filePath) {
        return soFar.then(function () {
          // projectName, filePath, userId, fileSystemFilePathToReadFileFrom
          var fileSystemFilePathToReadFileFrom = path.join(gitRepoPath, filePath);
          return addFileFromFileSytemToProject(
            project.get('projectName'),
            filePath,
            userId,
            fileSystemFilePathToReadFileFrom
          );
        });
      }, new Q());
    })
    .catch(function (err) {
      console.log('Error clonning git repo', err);
    });
};

module.exports = cloneGitRepositoryToProject;