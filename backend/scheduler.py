from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from . import database


def check_medication_reminders():
    current_time_str = datetime.now().strftime("%H:%M")
    medications = database.get_all_medications()

    for med in medications:
        for sched_time_str in med["times"]:
            if current_time_str == sched_time_str:
                print(f"🔔 REMINDER: It is time to take your {med['name']} ({med['dose']}).")

            sched_time_obj = datetime.strptime(sched_time_str, "%H:%M")
            current_time_obj = datetime.strptime(current_time_str, "%H:%M")
            time_difference = current_time_obj - sched_time_obj

            if time_difference.total_seconds() > 3600:
                was_taken = database.check_if_taken_today(med["id"])
                if not was_taken:
                    print(f"⚠️ ALERT: Missed Dose Detected! You have not logged taking {med['name']} scheduled for {sched_time_str}.")


scheduler = BackgroundScheduler()
scheduler.add_job(check_medication_reminders, "interval", minutes=1)


def start_scheduler():
    if not scheduler.running:
        scheduler.start()