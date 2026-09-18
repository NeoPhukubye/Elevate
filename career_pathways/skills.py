skills = {}


def add_skill(name, description):
    """Add a skill."""
    skill_id = name.lower().replace(" ", "_")

    skills[skill_id] = {
        "name": name,
        "description": description
    }

    return skill_id


def get_skill(skill_id):
    """Get a skill by its ID."""
    return skills.get(skill_id)


def get_all_skills():
    """Get all available skills."""
    return skills


def add_skill_to_career(career, skill_id):
    """Connect a skill to a career."""
    if career and skill_id not in career["skills"]:
        career["skills"].append(skill_id)