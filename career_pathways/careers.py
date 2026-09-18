careers = {}


def add_career(name, description, reason):
    """Add a career that the user is interested in."""
    career_id = name.lower().replace(" ", "_")

    careers[career_id] = {
        "name": name,
        "description": description,
        "reason": reason,
        "skills": []
    }

    return career_id


def get_career(career_id):
    """Get a career by its ID."""
    return careers.get(career_id)


def get_all_careers():
    """Get all careers added by the user."""
    return careers


def remove_career(career_id):
    """Remove a career."""
    if career_id in careers:
        del careers[career_id]
        return True

    return False