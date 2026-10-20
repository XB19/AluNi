# ---- Compilation
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- Exécution
FROM eclipse-temurin:17-jre
# Polices nécessaires à la génération des images et des PDF (certificats, rapports)
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 --create-home aluni \
    && mkdir -p /data/uploads && chown -R aluni /data/uploads
WORKDIR /app
COPY --from=build /app/target/aluni-backend-*.jar app.jar
USER aluni
ENV STORAGE_DIR=/data/uploads \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -Djava.awt.headless=true"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
