from flask import Flask, render_template

app = Flask(__name__)

# Define your menu items here
MENU_ITEMS = [
    {'key': 'chat', 'label': 'Chat'},
    {'key': 'flashcards', 'label': 'Flashcards'},
    {'key': 'podcast', 'label': 'Podcast'},
    {'key': 'calendar', 'label': 'Calendar'}
]

@app.route('/')
def home():
    return render_template('index.html', menu_items = MENU_ITEMS)

if __name__ == '__main__':
    app.run(debug=True)
