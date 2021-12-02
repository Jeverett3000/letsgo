import {nullCommit} from '../../lib/models/commit';
import {nullOperationStates} from '../../lib/models/operation-states';
  describe('inherited State methods', function() {
    let repository;

    beforeEach(function() {
      repository = Repository.absent();
      repository.destroy();
    });

    it('returns a null object', async function() {
      // Methods that default to "false"
      for (const method of [
        'isLoadingGuess', 'isAbsentGuess', 'isAbsent', 'isLoading', 'isEmpty', 'isPresent', 'isTooLarge',
        'isUndetermined', 'showGitTabInit', 'showGitTabInitInProgress', 'showGitTabLoading', 'showStatusBarTiles',
        'hasDiscardHistory', 'isMerging', 'isRebasing',
      ]) {
        assert.isFalse(await repository[method]());
      }

      // Methods that resolve to null
      for (const method of [
        'getFilePatchForPath', 'getAheadCount', 'getBehindCount', 'getConfig', 'getLastHistorySnapshots', 'getCache',
      ]) {
        assert.isNull(await repository[method]());
      }

      // Methods that resolve to an empty array
      for (const method of [
        'getRecentCommits', 'getAuthors', 'getDiscardHistory',
      ]) {
        assert.lengthOf(await repository[method](), 0);
      }

      assert.deepEqual(await repository.getStatusBundle(), {
        stagedFiles: {},
        unstagedFiles: {},
        mergeConflictFiles: {},
        branch: {
          oid: null,
          head: null,
          upstream: null,
          aheadBehind: {
            ahead: null,
            behind: null,
          },
        },
      });

      assert.deepEqual(await repository.getStatusesForChangedFiles(), {
        stagedFiles: [],
        unstagedFiles: [],
        mergeConflictFiles: [],
      });

      assert.strictEqual(await repository.getLastCommit(), nullCommit);
      assert.lengthOf((await repository.getBranches()).getNames(), 0);
      assert.isTrue((await repository.getRemotes()).isEmpty());
      assert.strictEqual(await repository.getHeadDescription(), '(no repository)');
      assert.strictEqual(await repository.getOperationStates(), nullOperationStates);
      assert.strictEqual(await repository.getCommitMessage(), '');
    });

    it('returns a rejecting promise', async function() {
      for (const method of [
        'init', 'clone', 'stageFiles', 'unstageFiles', 'stageFilesFromParentCommit', 'applyPatchToIndex',
        'applyPatchToWorkdir', 'commit', 'merge', 'abortMerge', 'checkoutSide', 'mergeFile',
        'writeMergeConflictToIndex', 'checkout', 'checkoutPathsAtRevision', 'undoLastCommit', 'fetch', 'pull',
        'push', 'setConfig', 'unsetConfig', 'createBlob', 'expandBlobToFile', 'createDiscardHistoryBlob',
        'updateDiscardHistory', 'storeBeforeAndAfterBlobs', 'restoreLastDiscardInTempFiles', 'popDiscardHistory',
        'clearDiscardHistory', 'discardWorkDirChangesForPaths', 'addRemote', 'setCommitMessage',
      ]) {
        await assert.isRejected(repository[method](), new RegExp(`${method} is not available in Destroyed state`));
      }

      await assert.isRejected(
        repository.readFileFromIndex('file'),
        /fatal: Path file does not exist \(neither on disk nor in the index\)\./,
      );
      await assert.isRejected(
        repository.getBlobContents('abcd'),
        /fatal: Not a valid object name abcd/,
      );
    });
  });

  describe('undoLastCommit()', function() {
    it('performs a soft reset', async function() {
      const workingDirPath = await cloneRepository('multiple-commits');
      const repo = new Repository(workingDirPath);
      await repo.getLoadPromise();

      fs.appendFileSync(path.join(workingDirPath, 'file.txt'), 'qqq\n', 'utf8');
      await repo.git.exec(['add', '.']);
      await repo.git.commit('add stuff');

      const parentCommit = await repo.git.getCommit('HEAD~');

      await repo.undoLastCommit();

      const commitAfterReset = await repo.git.getCommit('HEAD');
      assert.strictEqual(commitAfterReset.sha, parentCommit.sha);

      const fp = await repo.getFilePatchForPath('file.txt', {staged: true});
      assert.strictEqual(
        fp.toString(),
        dedent`
          diff --git a/file.txt b/file.txt
          --- a/file.txt
          +++ b/file.txt
          @@ -1,1 +1,2 @@
           three
          +qqq\n
        `,
      );
    });

    it('deletes the HEAD ref when only a single commit is present', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = new Repository(workingDirPath);
      await repo.getLoadPromise();

      fs.appendFileSync(path.join(workingDirPath, 'b.txt'), 'qqq\n', 'utf8');
      await repo.git.exec(['add', '.']);

      await repo.undoLastCommit();

      const fp = await repo.getFilePatchForPath('b.txt', {staged: true});
      assert.strictEqual(
        fp.toString(),
        dedent`
          diff --git a/b.txt b/b.txt
          new file mode 100644
          --- /dev/null
          +++ b/b.txt
          @@ -0,0 +1,2 @@
          +bar
          +qqq\n
        `,
      );
    });
  });

  describe('fetch(branchName, {remoteName})', function() {

    it('accepts a manually specified refspec and remote', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = new Repository(localRepoPath);
      await localRepo.getLoadPromise();

      let remoteHead, localHead;
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.strictEqual(remoteHead.messageSubject, 'second commit');
      assert.strictEqual(localHead.messageSubject, 'second commit');

      await localRepo.fetch('+refs/heads/master:refs/somewhere/master', {remoteName: 'origin'});
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      const fetchHead = await localRepo.git.getCommit('somewhere/master');
      assert.strictEqual(remoteHead.messageSubject, 'third commit');
      assert.strictEqual(localHead.messageSubject, 'second commit');
      assert.strictEqual(fetchHead.messageSubject, 'third commit');
    });

    it('is a noop with neither a manually specified source branch or a tracking branch', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = new Repository(localRepoPath);
      await localRepo.getLoadPromise();
      await localRepo.checkout('branch', {createNew: true});

      let remoteHead, localHead;
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('branch');
      assert.strictEqual(remoteHead.messageSubject, 'second commit');
      assert.strictEqual(localHead.messageSubject, 'second commit');

      assert.isNull(await localRepo.fetch('branch'));

      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('branch');
      assert.strictEqual(remoteHead.messageSubject, 'second commit');
      assert.strictEqual(localHead.messageSubject, 'second commit');
    });
  describe('getRemotes()', function() {
    it('returns an empty RemoteSet before the repository has loaded', async function() {
      const workdir = await cloneRepository('three-files');
      const repository = new Repository(workdir);
      assert.isTrue(repository.isLoading());

      const remotes = await repository.getRemotes();
      assert.isTrue(remotes.isEmpty());
    });

    it('returns a RemoteSet that indexes remotes by name', async function() {
      const workdir = await cloneRepository('three-files');
      const repository = new Repository(workdir);
      await repository.getLoadPromise();

      await repository.setConfig('remote.origin.url', 'git@github.com:smashwilson/atom.git');
      await repository.setConfig('remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*');

      await repository.setConfig('remote.upstream.url', 'git@github.com:atom/atom.git');
      await repository.setConfig('remote.upstream.fetch', '+refs/heads/*:refs/remotes/upstream/*');

      const remotes = await repository.getRemotes();
      assert.isFalse(remotes.isEmpty());

      const origin = remotes.withName('origin');
      assert.strictEqual(origin.getName(), 'origin');
      assert.strictEqual(origin.getUrl(), 'git@github.com:smashwilson/atom.git');
    });
  });

  describe('addRemote()', function() {
    it('adds a remote to the repository', async function() {
      const workdir = await cloneRepository('three-files');
      const repository = new Repository(workdir);
      await repository.getLoadPromise();

      assert.isFalse((await repository.getRemotes()).withName('ccc').isPresent());

      const remote = await repository.addRemote('ccc', 'git@github.com:aaa/bbb');
      assert.strictEqual(remote.getName(), 'ccc');
      assert.strictEqual(remote.getSlug(), 'aaa/bbb');

      assert.isTrue((await repository.getRemotes()).withName('ccc').isPresent());
    });
  });


    it('only performs a fast-forward merge with ffOnly', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories({remoteAhead: true});
      const localRepo = new Repository(localRepoPath);
      await localRepo.getLoadPromise();

      await localRepo.commit('fourth commit', {allowEmpty: true});

      let remoteHead, localHead;
      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.equal(remoteHead.messageSubject, 'second commit');
      assert.equal(localHead.messageSubject, 'fourth commit');

      await assert.isRejected(localRepo.pull('master', {ffOnly: true}), /Not possible to fast-forward/);

      remoteHead = await localRepo.git.getCommit('origin/master');
      localHead = await localRepo.git.getCommit('master');
      assert.equal(remoteHead.messageSubject, 'third commit');
      assert.equal(localHead.messageSubject, 'fourth commit');
    });
  describe('hasGitHubRemote(host, name, owner)', function() {
    it('returns true if the repo has at least one matching remote', async function() {
      const workdir = await cloneRepository('three-files');
      const repository = new Repository(workdir);
      await repository.getLoadPromise();

      await repository.addRemote('yes0', 'git@github.com:atom/github.git');
      await repository.addRemote('yes1', 'git@github.com:smashwilson/github.git');
      await repository.addRemote('no0', 'https://sourceforge.net/some/repo.git');

      assert.isTrue(await repository.hasGitHubRemote('github.com', 'smashwilson', 'github'));
      assert.isFalse(await repository.hasGitHubRemote('github.com', 'nope', 'no'));
      assert.isFalse(await repository.hasGitHubRemote('github.com', 'some', 'repo'));
    });
  });


      it('when adding a remote', async function() {
        const workdir = await cloneRepository('multi-commits-files');
        const repository = new Repository(workdir);
        await repository.getLoadPromise();

        const optionNames = ['core.editor', 'remotes.aaa.fetch', 'remotes.aaa.url'];
        await assertCorrectInvalidation({repository, optionNames}, async () => {
          await repository.addRemote('aaa', 'git@github.com:aaa/bbb.git');
        });
      });