from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import database

def check_medication_reminders():
    current_time_str = datetime.now().strftime("%H:%M")
    current_time_obj = datetime.strptime(current_time_str, "%H:%M")
    
    medications = database.get_all_medications()
    
    for med in medications:
        sched_time_str = med["schedule_time"]
        sched_time_obj = datetime.strptime(sched_time_str, "%H:%M")
        
        # Check 1: Is it exactly time to take the pill?
        if current_time_str == sched_time_str:
            print(f"🔔 REMINDER: It is time to take your {med['name']} ({med['dosage']}).")
            
        # Check 2: Has it been over an hour since the scheduled time? (Missed dose alert)
        time_difference = current_time_obj - sched_time_obj
        if time_difference.total_seconds() > 3600: # 3600 seconds = 1 hour
            
            # Check 3: Did they log it as taken today?
            was_taken = database.check_if_taken_today(med['id'])
            
            if not was_taken:
                print(f"⚠️ ALERT: Missed Dose Detected! You have not logged taking {med['name']} scheduled for {sched_time_str}.")

scheduler = BackgroundScheduler()
# Run this check every minute
scheduler.add_job(check_medication_reminders, 'interval', minutes=1)

def start_scheduler():
    scheduler.start()