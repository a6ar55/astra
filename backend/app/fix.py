    # Store result in Firebase if user is not anonymous
    firebase_result = None
    if user_id != "anonymous":
        try:
            # Log the result being stored
            logger.info(f"Storing prediction result in Firebase for user {user_id}")
            
            # Add to user's history
            history_item = add_analysis_to_history(user_id, text, result)
            if history_item:
                logger.info(f"Successfully added analysis to history for user {user_id}, item ID: {history_item.get("id")}")
                # Include the generated ID in the result
                result["id"] = history_item.get("id")
                firebase_result = history_item
            else:
                logger.error(f"Failed to add analysis to history for user {user_id}")
            
            # Update user's stats
            updated_stats = update_user_threat_stats(user_id, result)
            if updated_stats:
                logger.info(f"Successfully updated stats for user {user_id}")
            else:
                logger.error(f"Failed to update stats for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving to Firebase: {e}")
            logger.exception("Full traceback:")
            # Continue anyway to return prediction result
