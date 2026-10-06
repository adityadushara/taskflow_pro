from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.utils.responses import error_response

def create_app(config_class=Config):
    """Application factory for Flask REST API."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure CORS - Restrict allowed origins in accordance with security requirements
    # Defaults to http://localhost:3000 in development, configurable via FRONTEND_URL
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("FRONTEND_URL", "http://localhost:3000")}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    )

    # Register blueprints
    from app.routes.health import health_bp
    from app.routes.users import users_bp
    from app.routes.tasks import tasks_bp
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(tasks_bp, url_prefix="/api")

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return error_response(code="BAD_REQUEST", message=str(e.description or "Bad request"), status_code=400)

    @app.errorhandler(401)
    def unauthorized(e):
        return error_response(code="UNAUTHORIZED", message="Authentication required", status_code=401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response(code="FORBIDDEN", message="You do not have permission to perform this action", status_code=403)

    @app.errorhandler(404)
    def not_found(e):
        return error_response(code="NOT_FOUND", message="The requested resource was not found", status_code=404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return error_response(code="METHOD_NOT_ALLOWED", message="HTTP method not allowed for this route", status_code=405)

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal Server Error: {str(e)}")
        return error_response(code="INTERNAL_SERVER_ERROR", message="An unexpected server error occurred", status_code=500)

    return app
