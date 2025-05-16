import pandas as pd
import numpy as np
import os
import random
from pathlib import Path

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

# Define categories
CATEGORIES = {
    "Direct Violence Threats": [
        "I'm going to {action} you {time}",
        "You better watch out, I will {action} you with my {weapon}",
        "I know where you live and I'm coming to {action} you",
        "You deserve to be {action} for what you've done",
        "I will find you and {action} you {time}",
        "If I see you again, I will {action} you",
        "Someone should {action} people like you",
        "I'm planning to {action} everyone at {location}",
        "You won't be safe when I {action} you {time}",
        "I've been thinking about {action} you for a long time"
    ],
    
    "Criminal Activity": [
        "I know how to {criminal_act} and get away with it",
        "Let's {criminal_act} tonight and split the money",
        "I've been {criminal_act} for years and never got caught",
        "I can teach you how to {criminal_act} without getting caught",
        "The best way to {criminal_act} is through {method}",
        "We should {criminal_act} the {target} next week",
        "I have connections who can help us {criminal_act}",
        "If you help me {criminal_act}, I'll give you a cut",
        "I've been planning to {criminal_act} at {location}",
        "Here's my detailed plan to {criminal_act} successfully"
    ],
    
    "Harassment and Intimidation": [
        "I won't stop until you {consequence}",
        "You better do what I say or else I'll {consequence}",
        "I'm going to keep {harassment_action} until you {consequence}",
        "You think you can avoid me? I'll {harassment_action} everywhere you go",
        "I've been watching your {personal_detail} and I know your routine",
        "No matter where you go, I'll be there {harassment_action}",
        "You'll never feel safe as long as I'm {harassment_action}",
        "Everyone will know about your {personal_detail} if you don't {consequence}",
        "I'm going to make your life miserable by {harassment_action} every day",
        "You deserve to be {harassment_action} for what you are"
    ],
    
    "Hate Speech/Extremism": [
        "All {group} deserve to be {violent_action}",
        "The world would be better without {group}",
        "{group} are the reason everything is {negative_state}",
        "We need to eliminate {group} from our society",
        "I support the {violent_action} of all {group}",
        "{group} should be {violent_action} on sight",
        "It's our duty to {violent_action} every {group} we see",
        "History has shown that {group} can't be trusted and should be {violent_action}",
        "The only good {group} is a {violent_action} {group}",
        "{group} aren't even human and don't deserve rights"
    ],
    
    "Child Safety Threats": [
        "I like to watch children at {child_location}",
        "Children are easy to {predatory_action} if you {method}",
        "I know how to {predatory_action} children without getting caught",
        "I've been collecting photos of children from {child_location}",
        "I want to meet your {child_relation} when they're alone",
        "Children trust me easily when I {method}",
        "I know which {child_location} has the least supervision",
        "I can show you how to {predatory_action} children successfully",
        "The best time to {predatory_action} a child is when {circumstance}",
        "I've been planning to visit {child_location} to {predatory_action} children"
    ],
    
    "Non-threat/Neutral": [
        "I really enjoyed the movie we saw last night",
        "Could you please send me the report by tomorrow?",
        "The weather forecast predicts rain this weekend",
        "I'm planning to go hiking in the mountains",
        "Have you tried the new restaurant downtown?",
        "The traffic was terrible this morning",
        "My dog needs to go to the vet for a checkup",
        "I'm learning how to play the guitar in my free time",
        "The conference last week was very informative",
        "Do you have recommendations for good books to read?",
        "I need to buy groceries after work today",
        "The new software update has some great features",
        "Let's meet for coffee sometime next week",
        "My garden is looking beautiful this spring",
        "I'm thinking about changing my career path",
        "The election results will be announced tonight",
        "That was a fascinating documentary about marine life",
        "I've been working on this project for two months",
        "The customer service at that store is excellent",
        "My children are enjoying their summer vacation"
    ]
}

# Define variables to substitute in templates
VARIABLES = {
    "action": [
        "kill", "hurt", "attack", "beat up", "harm", "shoot", "stab", "assault", 
        "eliminate", "destroy", "end", "murder", "punch", "strangle", "bomb"
    ],
    "weapon": [
        "gun", "knife", "bat", "fists", "bomb", "weapon", "rifle", "machete", 
        "blade", "hammer", "acid", "poison", "explosives"
    ],
    "time": [
        "tomorrow", "soon", "next week", "when you least expect it", "tonight",
        "eventually", "when I find you", "the moment I see you", "before the end of the month",
        "on your way home", "while you sleep", "when the time is right"
    ],
    "location": [
        "your workplace", "your home", "that school", "the mall", "the park", 
        "your neighborhood", "the office", "downtown", "the event", "the gathering",
        "the theater", "the stadium", "the government building", "the airport"
    ],
    "criminal_act": [
        "steal", "rob a bank", "hack into systems", "commit fraud", "sell drugs",
        "smuggle illegal goods", "forge documents", "evade taxes", "launder money",
        "break into homes", "steal identities", "run a scam", "counterfeit currency",
        "hijack vehicles", "traffic illegal substances", "smuggle weapons"
    ],
    "method": [
        "using encryption", "through the dark web", "with inside help", "during night hours",
        "by bribing officials", "through shell companies", "using fake identities",
        "through social engineering", "by exploiting security flaws", "using advanced tools",
        "with a team of experts", "gaining trust first", "using disguises", "creating distractions"
    ],
    "target": [
        "bank", "store", "wealthy individual", "company", "government office",
        "elderly person", "tourist", "online account", "corporate network", "ATM",
        "jewelry store", "art gallery", "celebrity home", "warehouse", "shipping container"
    ],
    "consequence": [
        "lose your job", "regret it", "pay me", "suffer", "face public humiliation",
        "fear for your safety", "lose everything", "never find peace", "comply with my demands",
        "face consequences", "break down", "give in", "face exposure", "beg for mercy"
    ],
    "harassment_action": [
        "calling you", "following you", "messaging you", "posting about you", "spreading rumors",
        "contacting your friends", "showing up at your work", "tracking your movements",
        "monitoring your accounts", "taking pictures of you", "leaving notes", "stalking you",
        "watching you", "harassing your family", "exposing your secrets"
    ],
    "personal_detail": [
        "home address", "workplace", "daily routine", "children's school", "social media accounts",
        "phone number", "private emails", "family members", "medical history", "financial situation",
        "personal history", "relationships", "embarrassing incident", "secrets", "vulnerabilities"
    ],
    "group": [
        "immigrants", "foreigners", "minorities", "specific religious groups", "specific ethnic groups",
        "LGBTQ+ people", "specific nationalities", "refugees", "specific racial groups",
        "political opponents", "people with certain beliefs", "specific cultural groups"
    ],
    "violent_action": [
        "eliminated", "banned", "expelled", "removed", "attacked", "targeted", "silenced",
        "excluded", "punished", "purged", "driven out", "eradicated", "suppressed"
    ],
    "negative_state": [
        "broken", "failing", "corrupt", "declining", "threatened", "impure", "unsafe",
        "ruined", "damaged", "in danger", "under attack", "compromised", "deteriorating"
    ],
    "child_location": [
        "playgrounds", "schools", "parks", "swimming pools", "online games", "social media",
        "sports practices", "after-school programs", "malls", "movie theaters", 
        "amusement parks", "youth centers", "camps", "birthday parties"
    ],
    "child_relation": [
        "son", "daughter", "niece", "nephew", "younger sibling", "child", "students",
        "little one", "young relatives", "kids", "young friends"
    ],
    "predatory_action": [
        "approach", "befriend", "lure", "gain trust of", "manipulate", "isolate",
        "target", "groom", "meet with", "photograph", "contact", "interact with"
    ],
    "circumstance": [
        "they're alone", "parents are busy", "it's dark", "they're online unsupervised",
        "school is letting out", "they get separated from guardians", "they need help",
        "they're looking for attention", "they're vulnerable", "they're naive"
    ]
}

# Function to fill in template with variables
def fill_template(template, vars_dict):
    filled = template
    
    # Find all variables in template
    import re
    variables = re.findall(r'\{([^}]+)\}', template)
    
    # Replace each variable with a random choice from its list
    for var in variables:
        if var in vars_dict:
            replacement = random.choice(vars_dict[var])
            filled = filled.replace(f"{{{var}}}", replacement)
    
    return filled

def generate_threatening_dataset(n_samples=10000):
    """
    Generate a dataset of threatening and non-threatening messages
    
    Args:
        n_samples: Number of samples to generate
        
    Returns:
        pandas.DataFrame: Generated dataset
    """
    # Determine category distribution (balanced with slight emphasis on non-threats)
    categories = list(CATEGORIES.keys())
    num_categories = len(categories)
    
    # Slightly more non-threats (about 25% of the dataset)
    category_probs = [0.12, 0.12, 0.12, 0.15, 0.15, 0.34] 
    
    # Generate texts and labels
    texts = []
    labels = []
    
    for _ in range(n_samples):
        # Select a category
        category = np.random.choice(categories, p=category_probs)
        
        # Get templates for this category
        templates = CATEGORIES[category]
        
        # Select and fill template
        template = random.choice(templates)
        text = fill_template(template, VARIABLES)
        
        # Add some randomness and variation
        # Occasionally add filler phrases at beginning or end
        if random.random() < 0.4:
            fillers_start = [
                "I have to tell you that ", "I'm serious when I say ", "Listen carefully, ",
                "I want you to know that ", "I'm warning you, ", "To be honest, ",
                "Between you and me, ", "Let me be clear: ", "I'm not joking when I say ",
                "I've been thinking and ", "For the last time, ", "Take this seriously: ",
                "Just so you know, ", "Let me tell you something - ", "This isn't a joke: "
            ]
            text = random.choice(fillers_start) + text
        
        if random.random() < 0.3:
            fillers_end = [
                " Do you understand?", " Remember what I said.", " You've been warned.",
                " Think about it.", " I mean it.", " This is not a joke.",
                " Mark my words.", " Don't ignore this.", " I'm dead serious.",
                " Keep that in mind.", " That's a promise.", " You can count on it.",
                " I hope we're clear.", " Take it seriously.", " I won't say it again."
            ]
            text += random.choice(fillers_end)
            
        # Add additional context for non-threats to make them more diverse
        if category == "Non-threat/Neutral" and random.random() < 0.5:
            contexts = [
                "I saw on the news that ", "My friend mentioned that ", "I read an article about how ",
                "Did you hear about ", "I'm excited because ", "It's interesting that ",
                "I'm a bit concerned about ", "Have you considered that ", "I was thinking about how ",
                "It's amazing that ", "Can you believe ", "I just realized that ",
                "My colleague told me that ", "I've been wondering if "
            ]
            text = random.choice(contexts) + text.lower()
        
        # Add variation in capitalization, punctuation etc. to be more realistic
        if random.random() < 0.1:
            text = text.upper()  # ALL CAPS
        elif random.random() < 0.2:
            text = text.lower()  # no caps
            
        # Sometimes remove ending punctuation
        if random.random() < 0.2 and text[-1] in ".!?":
            text = text[:-1]
            
        # Sometimes add extra punctuation for emphasis
        if random.random() < 0.2:
            if text[-1] == '.':
                text = text[:-1] + '!!!'
            elif text[-1] == '!':
                text = text + '!!'
            elif text[-1] == '?':
                text = text + '??'
            
        texts.append(text)
        labels.append(category)
    
    # Create dataframe
    df = pd.DataFrame({
        'text': texts,
        'label': labels
    })
    
    # Shuffle the dataframe
    df = df.sample(frac=1).reset_index(drop=True)
    
    return df

def main():
    # Create data directory if it doesn't exist
    data_dir = Path(__file__).parent
    data_dir.mkdir(exist_ok=True)
    
    # Generate data
    print("Generating threat dataset...")
    df = generate_threatening_dataset(n_samples=10000)
    
    # Print distribution
    print("\nCategory distribution:")
    print(df['label'].value_counts())
    
    # Save to CSV
    output_path = data_dir / "threat_dataset_10k.csv"
    df.to_csv(output_path, index=False)
    print(f"\nDataset saved to {output_path}")
    
    # Print some examples
    print("\nExample texts:")
    for category in CATEGORIES.keys():
        examples = df[df['label'] == category].sample(min(3, len(df[df['label'] == category])))
        print(f"\n{category}:")
        for _, row in examples.iterrows():
            print(f"  - {row['text']}")

if __name__ == "__main__":
    main() 