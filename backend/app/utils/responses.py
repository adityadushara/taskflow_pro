from flask import jsonify

def success_response(data=None, status_code=200):
    """
    Standard successful API response.
    Returns:
    {
        "success": True,
        "data": ...
    }
    """
    return jsonify({
        "success": True,
        "data": data if data is not None else {}
    }), status_code

def error_response(code="INTERNAL_SERVER_ERROR", message="An unexpected error occurred", status_code=500, details=None):
    """
    Standard error API response.
    Returns:
    {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details (optional)
        }
    }
    """
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }
    if details is not None:
        payload["error"]["details"] = details
        
    return jsonify(payload), status_code
