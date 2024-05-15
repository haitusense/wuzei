import os
import time
import datetime
import json

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from urllib.parse import urlparse
import re

#-------- def --------

# driver.find_element(By.NAME,"identity").send_keys("hogehoge@email.com")
# driver.find_element(By.NAME,"password").send_keys("fugafuga")
# driver.find_element(By.CLASS_NAME,"sessions_button--wide").click()
# driver.find_elements(By.XPATH, "//*[starts-with(@class,'description_metaDetail_')]")

def tver(drv):
  title = drv.until(EC.presence_of_element_located((By.XPATH, "//*[starts-with(@class,'titles_seriesTitle_')]")))
  subtitle = drv.until(EC.presence_of_element_located((By.XPATH, "//*[starts-with(@class,'titles_title_')]")))
  for i in drv.until(EC.presence_of_all_elements_located((By.XPATH, "//*[starts-with(@class,'description_metaDetail_')]"))):
    if "放送分" in i.text:
      data = re.match(r'(\d+)月(\d+)日', i.text)
      break
  return {
    "title" : title.text,
    "subtitle" : subtitle.text,
    "data" : str(int(data.group(1))).zfill(2) + str(int(data.group(2))).zfill(2),
    "site" : "TVer"
  }

def abema(drv):
  title = drv.until(EC.presence_of_element_located((By.XPATH, "//*[starts-with(@class,'com-video-EpisodeTitle__series-info')]")))
  subtitle = drv.until(EC.presence_of_element_located((By.XPATH, "//*[starts-with(@class,'com-video-EpisodeTitle__episode-title')]")))
  return {
    "title" : title.text,
    "subtitle" : subtitle.text,
    "site" : "AbemaTV"
  }

#-------- main --------
ytdlp = 'yt-dlp.exe'
url = 'https://tver.jp/episodes/eprczzwdq3'
cookies = '--cookies-from-browser chrome'
outpath = r'C:\Users\hoge\Desktop\DL' + '\\'
dt = '2024-04-20T04:12'

def call_yt(obj):
  outpath = f"2024{obj['data']}_{obj['title']}_{obj['subtitle']}_{obj['site']}.mp4"
  outpath = re.sub(r'[\\|/|:|?|"|<|>|\|]', '-', outpath)
  os.system(f"{ytdlp} {url}")

def call_ytdlp(url):
  dt_target = datetime.datetime.fromisoformat(dt)
  dt_now = datetime.datetime.now()
  if (dt_target - dt_now).total_seconds() > 30:
    print(f"\rwait : {dt_target - dt_now}", end="")
    return 2
  print("")
  return os.system(f"{ytdlp} {url}") # success : 0 / error : 1

# public static string Blue(string src) => $"\x1b[94m{src}\x1b[0m";
# public static string Green(string src) => $"\x1b[92m{src}\x1b[0m";
# public static string Red(string src) => $"\x1b[91m{src}\x1b[0m";
# public static string Yellow(string src) => $"\x1b[93m{src}\x1b[0m";

#-------- main --------
def main(url):
  try:
    options = Options()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options)
    driver.get(url)
    logs = driver.get_log("browser")
    for log in logs:
      print(log)
    match urlparse(url).netloc:
      case 'tver.jp':
        dst = tver(WebDriverWait(driver, 10))
      case 'abema.tv':
        dst = abema(WebDriverWait(driver, 10))
      case _:
        dst = { }
    logs = driver.get_log("browser")
    for log in logs:
      print(log)
    print(dst)
    # call_yt(dst)
    driver.quit()
    outpath = f"2024{dst['data']}_{dst['title']}_{dst['subtitle']}_{dst['site']}.mp4"
    outpath = re.sub(r'[\\|/|:|?|"|<|>|\|]', '-', outpath)
    # return json.dumps(dst, ensure_ascii=False)
    return outpath
  except:
    return 'failed'

