import json
import os
import re

def remove_html(text):
    if not isinstance(text, str):
        return ""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)

def clean_data(input_path, output_path):
    print(f"Loading raw data from {input_path}...")
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {input_path} not found. Run collect_data.py first.")
        return

    cleaned_data = []
    seen = set()

    print("Cleaning data...")
    for item in data:
        q = item.get('question', '')
        a = item.get('answer', '')

        # Remove HTML tags
        q = remove_html(q).strip()
        a = remove_html(a).strip()

        # Filter out empty or very short examples
        if len(q) < 5 or len(a) < 5:
            continue

        # Create a unique key to filter duplicates
        unique_key = q.lower() + " ||| " + a.lower()
        if unique_key not in seen:
            seen.add(unique_key)
            cleaned_data.append({
                'question': q,
                'answer': a,
                'source': item.get('source', 'unknown')
            })

    print(f"Original size: {len(data)}")
    print(f"Cleaned size: {len(cleaned_data)}")
    print(f"Removed {len(data) - len(cleaned_data)} duplicates/invalid items.")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, indent=2)
    
    print(f"Saved cleaned dataset to {output_path}")

if __name__ == '__main__':
    base_dir = os.path.dirname(__file__)
    input_file = os.path.join(base_dir, 'raw_data.json')
    output_file = os.path.join(base_dir, 'cleaned_dataset.json')
    clean_data(input_file, output_file)
