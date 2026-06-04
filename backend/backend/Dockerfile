# ---- Build Stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# ---- Runtime Stage (Tomcat 11 - required by Spring Boot 4.0.6 / Servlet 6.1) ----
FROM tomcat:11.0-jdk21-temurin
WORKDIR /usr/local/tomcat
RUN rm -rf webapps/*
COPY --from=build /app/target/*.war webapps/back.war
EXPOSE 8080
CMD ["catalina.sh", "run"]
