import os
import stat
import shutil
from pathlib import Path
from typing import Optional
import git
from git import Repo, GitCommandError, InvalidGitRepositoryError
from utils.helper import extract_repo_name


REPOS_DIR = Path("repos")


def _remove_existing_repo(path: Path) -> None:
    def make_writable(func, failed_path, error):
        os.chmod(failed_path, stat.S_IWRITE)
        func(failed_path)

    shutil.rmtree(path, onerror=make_writable)


def get_repo_local_path(repo_url: str) -> Path:
    repo_name = extract_repo_name(repo_url)
    return REPOS_DIR / repo_name


def clone_repository(repo_url: str, progress_callback=None) -> tuple[bool, str, Optional[str]]:
    try:
        REPOS_DIR.mkdir(parents=True, exist_ok=True)
        repo_name = extract_repo_name(repo_url)
        local_path = REPOS_DIR / repo_name

        if local_path.exists():
            _remove_existing_repo(local_path)

        class CloneProgress(git.RemoteProgress):
            def update(self, op_code, cur_count, max_count=None, message=""):
                if progress_callback and max_count:
                    pct = int((cur_count / max_count) * 100)
                    progress_callback(pct, message or "Cloning...")

        Repo.clone_from(
            repo_url,
            str(local_path),
            progress=CloneProgress() if progress_callback else None,
            depth=1,
        )

        return True, str(local_path), None

    except GitCommandError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower() or "repository" in error_msg.lower():
            return False, "", "Repository not found or is private. Please check the URL."
        if "authentication" in error_msg.lower():
            return False, "", "Authentication failed. Only public repositories are supported."
        return False, "", f"Git error: {error_msg}"
    except Exception as e:
        return False, "", f"Unexpected error during cloning: {str(e)}"


def get_repo_info(repo_path: str) -> dict:
    try:
        repo = Repo(repo_path)
        try:
            branch = repo.active_branch.name
        except TypeError:
            branch = "detached HEAD"

        try:
            last_commit = repo.head.commit
            commit_hash = last_commit.hexsha[:8]
            commit_message = last_commit.message.strip()
            author = last_commit.author.name
        except Exception:
            commit_hash = "N/A"
            commit_message = "N/A"
            author = "N/A"

        remote_url = ""
        try:
            remote_url = repo.remotes.origin.url
        except Exception:
            pass

        return {
            "branch": branch,
            "commit_hash": commit_hash,
            "commit_message": commit_message,
            "author": author,
            "remote_url": remote_url,
        }
    except (InvalidGitRepositoryError, Exception):
        return {
            "branch": "N/A",
            "commit_hash": "N/A",
            "commit_message": "N/A",
            "author": "N/A",
            "remote_url": "",
        }


def is_valid_repo_path(path: str) -> bool:
    return Path(path).exists() and Path(path).is_dir()
