# Created as its own file to avoid import issues. Should be able to be used in any python file now.
import logging

# Configure a log just to catch specific bugs that pop up
short_logger = logging.getLogger("short_logger")
# Append logs to file short.log
file_handler = logging.FileHandler("short.log")
file_handler.setFormatter(logging.Formatter("[%(asctime)s] - %(message)s"))
short_logger.setLevel(logging.DEBUG)
short_logger.addHandler(file_handler)
