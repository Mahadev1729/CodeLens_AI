from pathlib import Path
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from utils.helper import safe_read_file
from services.loader import iter_source_files


BUG_FINDER_PROMPT = """You are a senior security engineer and code quality expert. Analyze the following source files from a repository and identify bugs, security vulnerabilities, and code quality issues.

Repository: {repo_name}

Source Files:
{file_contents}

Perform a comprehensive analysis and identify issues in these categories:
- Duplicated code
- Dead code (unreachable or unused code)
- Missing exception handling
- Possible SQL injection vulnerabilities
- Security issues (hardcoded credentials, exposed secrets, insecure practices)
- Performance issues (N+1 queries, inefficient loops, memory leaks)
- Long functions (functions exceeding 50 lines)
- Unused imports
- Code smells (poor naming, magic numbers, god classes)
- Other critical issues

For EACH issue found, format it exactly like this:

---
**Issue:** [Brief title of the issue]
**File:** [filename and line range if applicable]
**Severity:** [High / Medium / Low]
**Category:** [Category from the list above]
**Description:** [Detailed description of the problem]
**Fix:** [Concrete recommendation to fix it]

---

After listing all issues, provide:

## Summary
- Total Issues Found: [number]
- High Severity: [number]
- Medium Severity: [number]
- Low Severity: [number]

## Overall Code Health
[Brief assessment: Excellent / Good / Fair / Poor with justification]"""


def find_bugs(
    repo_path: str,
    api_key: str,
    model: str = "openai/gpt-oss-20b",
) -> str:
    repo_name = Path(repo_path).name
    file_contents_parts = []
    total_chars = 0
    max_chars = 20000

    for file_path in iter_source_files(repo_path):
        if total_chars >= max_chars:
            break
        content = safe_read_file(str(file_path))
        if not content or not content.strip():
            continue
        rel_path = str(file_path.relative_to(Path(repo_path)))
        ext = file_path.suffix.lstrip(".")
        snippet = content[:3000] if len(content) > 3000 else content
        part = f"### File: {rel_path}\n```{ext}\n{snippet}\n```"
        file_contents_parts.append(part)
        total_chars += len(part)

    if not file_contents_parts:
        return "No source files found to analyze."

    file_contents = "\n\n".join(file_contents_parts)
    prompt = BUG_FINDER_PROMPT.format(
        repo_name=repo_name,
        file_contents=file_contents,
    )

    llm = ChatGroq(api_key=api_key, model=model, temperature=0.0, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content


def parse_bugs(bug_report: str) -> list[dict]:
    issues = []
    blocks = bug_report.split("---")
    for block in blocks:
        block = block.strip()
        if "**Issue:**" not in block:
            continue
        issue = {}
        for line in block.splitlines():
            line = line.strip()
            if line.startswith("**Issue:**"):
                issue["title"] = line.replace("**Issue:**", "").strip()
            elif line.startswith("**File:**"):
                issue["file"] = line.replace("**File:**", "").strip()
            elif line.startswith("**Severity:**"):
                issue["severity"] = line.replace("**Severity:**", "").strip()
            elif line.startswith("**Category:**"):
                issue["category"] = line.replace("**Category:**", "").strip()
            elif line.startswith("**Description:**"):
                issue["description"] = line.replace("**Description:**", "").strip()
            elif line.startswith("**Fix:**"):
                issue["fix"] = line.replace("**Fix:**", "").strip()
        if issue.get("title"):
            issues.append(issue)
    return issues
