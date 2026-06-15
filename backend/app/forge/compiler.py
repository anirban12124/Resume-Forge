import os
import shutil
import subprocess
import uuid
from typing import Optional

class TectonicError(Exception):
    """Exception raised when Tectonic compilation fails."""
    def __init__(self, message: str, log: str = ""):
        super().__init__(message)
        self.log = log

def compile_latex(tex_content: str) -> Optional[bytes]:
    """
    Writes .tex content to a temp file inside the workspace.
    Attempts to compile using Tectonic with a 15-second timeout.
    If Tectonic is not available, returns None (fallback).
    If compilation fails, raises TectonicError with the error logs.
    """
    # Verify if tectonic is available in the system path
    tectonic_path = shutil.which("tectonic")
    if not tectonic_path:
        print("Tectonic is not available locally. Falling back to raw TeX file only.")
        return None

    # Create a unique temporary directory inside the workspace (e.g. backend/temp/...)
    # using current directory relative path to keep it in workspace.
    workspace_temp_base = os.path.join(os.getcwd(), "temp")
    os.makedirs(workspace_temp_base, exist_ok=True)
    
    unique_dir = f"compile_{uuid.uuid4().hex}"
    temp_dir = os.path.join(workspace_temp_base, unique_dir)
    os.makedirs(temp_dir, exist_ok=True)

    tex_file_path = os.path.join(temp_dir, "resume.tex")
    pdf_file_path = os.path.join(temp_dir, "resume.pdf")

    try:
        # Write .tex content
        with open(tex_file_path, "w", encoding="utf-8") as f:
            f.write(tex_content)

        # Run Tectonic command with a 15-second timeout
        # Using shell=True for safety on Windows is generally not needed if we pass list,
        # but Tectonic is an executable.
        try:
            result = subprocess.run(
                ["tectonic", "resume.tex"],
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=15.0
            )
        except subprocess.TimeoutExpired as te:
            # Re-raise as tectonic error
            stdout_log = te.stdout if te.stdout else ""
            stderr_log = te.stderr if te.stderr else ""
            raise TectonicError(
                "Tectonic compilation timed out after 15 seconds.",
                log=f"STDOUT:\n{stdout_log}\nSTDERR:\n{stderr_log}"
            ) from te

        # Check return code
        if result.returncode != 0:
            raise TectonicError(
                f"Tectonic failed with exit code {result.returncode}.",
                log=f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            )

        # Read compiled PDF bytes
        if os.path.exists(pdf_file_path):
            with open(pdf_file_path, "rb") as f:
                pdf_bytes = f.read()
            return pdf_bytes
        else:
            raise TectonicError(
                "Tectonic succeeded but output PDF was not found.",
                log=f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            )

    finally:
        # Clean up the temp directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass
