/**
 * index.js
 *
 * Central re-export barrel for the api/ module. Consumers can import any
 * service or config helper from this single entry point rather than importing
 * from individual service files.
 *
 * Key functions:
 *   (re-exports everything from config, authService, mealService, weightService,
 *    userService, foodService, and profileService)
 */
// src/api/index.js

export * from './config';
export * as authService from './authService';
export * as mealService from './mealService';
export * as weightService from './weightService';
export * as userService from './userService';
export * as foodService from './foodService';
export * as profileService from './profileService';