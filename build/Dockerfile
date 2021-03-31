FROM node:14.15.4
# Copy source files
COPY / /
# Install dependencies
RUN npm install

#Rebuild grpc
RUN npm rebuild grpc

# Run UNIT tests
RUN npx jest

# Build application
RUN npx webpack --mode=production
# Generate documentation
RUN npx typedoc --out docs ./src
# Node environment mode
ENV APP_MODE=production
ENV ENV_MODE=production
# LAAPI env
ENV API_HOST=https://domain.tld
ENV API_BASE='/v1'
ENV API_PORT=8080
ENV API_CORS=true
ENV API_COMPRESSION=true
ENV LOGGING_LEVEL='debug'
# LAAPI API reference env
ENV API_DOCS_ENABLED=true
ENV API_DOCS_ROOT_FOLDER=docs
ENV API_DOCS_HTTP_PATH=/api-docs/reference
# LAAPI Swagger env
ENV API_SWAGGER_ENABLED=true
ENV API_SWAGGER_API_VERSION=3.0.0
ENV API_SWAGGER_HTTP_PATH=/api-docs/swagger
ENV API_SWAGGER_TITLE='Part Chain Asset Exchange'
ENV API_SWAGGER_DESCRIPTION='API service for Exchanging Assets between Parties'.
ENV API_SWAGGER_VERSION=1.0.0
# LAAPI DB env
ENV API_DATABASE_TYPE=postgres
ENV API_DATABASE_PORT=5432
# Copy Keycloak configuration and run application
CMD ["sh", "-c", "cp ${KEYCLOAK_CONFIG_PATH} keycloak.json && NODE_ENV=${ENV_MODE} node dist/index.js --http-server-default-timeout=300"]
# Expose API port from container
EXPOSE ${API_PORT}

