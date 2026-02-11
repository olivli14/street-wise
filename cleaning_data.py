import pandas as pd
import re
df = pd.read_csv("2025_San_Jose_Crime.csv")
#preprocessing the data
new_df = df.drop(columns=["CDTS", "EID", "START_DATE", "CALL_NUMBER", "PRIORITY", "REPORT_DATE", "OFFENSE_TIME", "CALLTYPE_CODE", "FINAL_DISPO_CODE"])
relevant_crimes = ["ASSAULT", "SHOOTING INTO OCCP VEH OR DWELLING", "ASSAULT WITH DEADLY WEAPON", "RESISTING ARREST, GANG RELATED", "MURDER", "ASSAULT WITH DEADLY WEAPON (COMBINED EVENT)", "ASSAULT WITH DEADLY WEAPON, GANG", "ARMED ROBBERY, GANG RELATED", "ROBBERY, GANG RELATED", "KIDNAPPING"]
filtered_df = new_df.loc[new_df["CALL_TYPE"].isin(relevant_crimes)]
filtered_df = filtered_df[filtered_df["FINAL_DISPO"] == "Arrest Made"]

#function to get the address
def get_midpoint(address):
    if not isinstance(address, str):
        return address
    m = re.match(r"\[(\d+)\]-\[(\d+)\]\s+(.*)", address)
    if not m:
        return address
    start, end, street = int(m.group(1)), int(m.group(2)), m.group(3)
    mid = (start + end) // 2
    return f"{mid} {street}"

filtered_df["ADDRESS_MIDPOINT"] = filtered_df["ADDRESS"].apply(get_midpoint)
print(filtered_df.head())
print(filtered_df["ADDRESS_MIDPOINT"].head())