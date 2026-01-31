/*
 * @ (#) ResourceNotFoundException.java    1.0
 * Copyright (c)  IUH. All rights reserved.
 */
package iuh.fit.edu.backend.exception;

/*
 * @description: Exception thrown when a resource is not found
 * @author: Huu Thai
 * @date:
 * @version: 1.0
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
