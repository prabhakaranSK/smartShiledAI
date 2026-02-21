# step 1: switch directory frontend
    1. cd backend
# step 2: craete venv
    2. python -m venv venv
# step 2: create .env file with this 
    3. DATABASE_URL=postgresql://[Username]:[Password]@localhost:5432/smart_auditor_db
# step 3: activate the venv
    4.venv/Scripts/activate
# step 3: install the requirement
    5.pip install -r requirements.txt
# step 4: run the backend
    6.uvicorn app.main:app --reload