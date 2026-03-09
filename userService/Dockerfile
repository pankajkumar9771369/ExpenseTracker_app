# Use the official OpenJDK 21 base image
FROM --platform=linux/amd64 amazoncorretto:21

# Set the working directory inside the container
WORKDIR /app

# Copy the JAR file from the host to the container
COPY build/libs/userservice-0.0.1-SNAPSHOT.jar /app/userservice.jar

# Expose the port for the user service
EXPOSE 9898

# Run the application
ENTRYPOINT ["java", "-jar", "/app/userservice.jar"]
