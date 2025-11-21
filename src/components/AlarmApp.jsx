import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, AlarmClock, Plus, Trash2, Volume2, Vibrate, Music, Calendar, Sun, Moon, ChevronRight, Power, Zap } from 'lucide-react'

// Utilities
const speak = (text) => {
  try {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'hi-IN'
    utter.pitch = 1
    utter.rate = 1
    speechSynthesis.speak(utter)
  } catch (e) {
    // ignore
  }
}

const pad = (n) => n.toString().padStart(2, '0')

const days = [
  { key: 'sun', label: 'रवि' },
  { key: 'mon', label: 'सोम' },
  { key: 'tue', label: 'मंगल' },
  { key: 'wed', label: 'बुध' },
  { key: 'thu', label: 'गुरु' },
  { key: 'fri', label: 'शुक्र' },
  { key: 'sat', label: 'शनि' },
]

const defaultAlarm = () => ({
  id: crypto.randomUUID(),
  hour: 7,
  minute: 0,
  ampm: 'AM',
  enabled: true,
  repeat: 'daily', // daily | weekdays | weekends | custom | once
  customDays: ['mon','tue','wed','thu','fri'],
  label: 'अलार्म',
  vibrate: true,
  flashlight: false,
  ringtoneName: 'Default',
  ringtoneUrl: null,
  longRing: true,
})

const loadAlarms = () => {
  const raw = localStorage.getItem('alarms-v1')
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}
const saveAlarms = (alarms) => localStorage.setItem('alarms-v1', JSON.stringify(alarms))

const useNow = () => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const formatTime12 = (d) => {
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${pad(h)}:${pad(m)} ${ampm}`
}

const formatHindiDate = (d) => {
  const daysHN = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार']
  const monthsHN = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर']
  return `${daysHN[d.getDay()]}, ${d.getDate()} ${monthsHN[d.getMonth()]} ${d.getFullYear()}`
}

const matchDayRule = (date, alarm) => {
  if (alarm.repeat === 'daily') return true
  const dayKeys = ['sun','mon','tue','wed','thu','fri','sat']
  const key = dayKeys[date.getDay()]
  if (alarm.repeat === 'weekdays') return ['mon','tue','wed','thu','fri'].includes(key)
  if (alarm.repeat === 'weekends') return ['sun','sat'].includes(key)
  if (alarm.repeat === 'custom') return alarm.customDays.includes(key)
  if (alarm.repeat === 'once') return true
  return true
}

const nextTriggerMs = (now, alarm) => {
  // Compute next Date matching alarm schedule
  const base = new Date(now)
  let h = alarm.hour % 12
  if (alarm.ampm === 'PM') h = (h % 12) + 12
  if (alarm.ampm === 'AM' && h === 12) h = 0
  const target = new Date(base)
  target.setSeconds(0, 0)
  target.setHours(h, alarm.minute, 0, 0)
  if (target <= base || !matchDayRule(target, alarm)) {
    // roll forward up to 7 days
    for (let i = 1; i <= 7; i++) {
      const roll = new Date(target)
      roll.setDate(roll.getDate() + i)
      if (matchDayRule(roll, alarm)) {
        roll.setHours(h, alarm.minute, 0, 0)
        return roll - base
      }
    }
  }
  return target - base
}

const RingtonePicker = ({ value, onChange }) => {
  const fileRef = useRef()
  return (
    <div className="flex items-center gap-3">
      <Music className="w-5 h-5 text-blue-400"/>
      <button
        className="px-3 py-2 rounded-lg bg-slate-700/60 text-blue-100 hover:bg-slate-600"
        onClick={() => fileRef.current.click()}
      >
        {value?.name || 'गैलरी से रिंगटोन चुनें'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const url = URL.createObjectURL(file)
            onChange({ name: file.name, url })
          }
        }}
      />
    </div>
  )
}

const AlarmForm = ({ initial, onSave, onCancel }) => {
  const [data, setData] = useState(initial || defaultAlarm())
  const [tab, setTab] = useState('time')
  const set = (p) => setData((d) => ({ ...d, ...p }))

  const toggleDay = (key) => {
    set({
      customDays: data.customDays.includes(key)
        ? data.customDays.filter((k) => k !== key)
        : [...data.customDays, key],
      repeat: 'custom'
    })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <AlarmClock className="w-6 h-6 text-blue-400"/>
        <h3 className="text-lg text-white font-semibold">नया अलार्म</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="text-blue-200 text-sm">घंटा</label>
          <input type="number" min="1" max="12" value={data.hour}
            onChange={(e)=>set({hour: Math.max(1, Math.min(12, Number(e.target.value)||1))})}
            className="w-full mt-1 bg-slate-700/60 text-white p-2 rounded"
          />
        </div>
        <div className="col-span-1">
          <label className="text-blue-200 text-sm">मिनट</label>
          <input type="number" min="0" max="59" value={data.minute}
            onChange={(e)=>set({minute: Math.max(0, Math.min(59, Number(e.target.value)||0))})}
            className="w-full mt-1 bg-slate-700/60 text-white p-2 rounded"
          />
        </div>
        <div className="col-span-1">
          <label className="text-blue-200 text-sm">AM/PM</label>
          <select value={data.ampm} onChange={(e)=>set({ampm:e.target.value})}
            className="w-full mt-1 bg-slate-700/60 text-white p-2 rounded">
            <option>AM</option>
            <option>PM</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-blue-200 text-sm">लेबल</label>
          <input value={data.label} onChange={(e)=>set({label:e.target.value})}
            className="w-full mt-1 bg-slate-700/60 text-white p-2 rounded"/>
        </div>
        <div>
          <label className="text-blue-200 text-sm">दोहराव</label>
          <select value={data.repeat} onChange={(e)=>set({repeat:e.target.value})}
            className="w-full mt-1 bg-slate-700/60 text-white p-2 rounded">
            <option value="once">केवल एक बार</option>
            <option value="daily">दैनिक</option>
            <option value="weekdays">कार्यदिवस</option>
            <option value="weekends">सप्ताहांत</option>
            <option value="custom">कस्टम</option>
          </select>
        </div>
      </div>

      {data.repeat === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          {days.map((d) => (
            <button key={d.key}
              onClick={()=>toggleDay(d.key)}
              className={`px-3 py-1 rounded-full border ${data.customDays.includes(d.key)?'bg-blue-500 border-blue-400 text-white':'border-blue-400/40 text-blue-100'} `}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-blue-100"><Vibrate className="w-5 h-5"/>वाइब्रेशन</span>
          <input type="checkbox" checked={data.vibrate} onChange={(e)=>set({vibrate:e.target.checked})}/>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-blue-100"><Zap className="w-5 h-5"/>फ्लैशलाइट</span>
          <input type="checkbox" checked={data.flashlight} onChange={(e)=>set({flashlight:e.target.checked})}/>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-blue-100"><Volume2 className="w-5 h-5"/>लंबा रिंग</span>
          <input type="checkbox" checked={data.longRing} onChange={(e)=>set({longRing:e.target.checked})}/>
        </div>
      </div>

      <RingtonePicker value={data.ringtoneUrl?{name:data.ringtoneName}:null}
        onChange={(r)=>set({ringtoneName:r.name, ringtoneUrl:r.url})} />

      <div className="flex items-center justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded bg-slate-600 text-white">रद्द करें</button>
        <button onClick={()=>onSave(data)} className="px-4 py-2 rounded bg-blue-600 text-white">सेव करें</button>
      </div>
    </div>
  )
}

const AlarmRinging = ({ alarm, onStop }) => {
  const audioRef = useRef(null)
  const flashRef = useRef(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const a = document.getElementById('ringtone-el')
    if (a) {
      a.loop = true
      a.volume = 1
      a.play().catch(()=>{})
    }
    let vibTimer
    if (alarm.vibrate && navigator.vibrate) {
      vibTimer = setInterval(()=> navigator.vibrate([300, 200, 300]), 1000)
    }
    let flashTimer
    if (alarm.flashlight) {
      // We cannot control device flashlight from web reliably. As fallback, blink screen bright overlay.
      flashTimer = setInterval(()=> setTick((t)=>t+1), 300)
    }
    speak(`समय है, ${alarm.label}. जागो इंडिया जागो`)

    const keepAwake = async () => {
      try {
        if ('wakeLock' in navigator) {
          // @ts-ignore
          const lock = await navigator.wakeLock.request('screen')
          flashRef.current = lock
        }
      } catch {}
    }
    keepAwake()

    return () => {
      a && a.pause()
      if (vibTimer) clearInterval(vibTimer)
      if (flashTimer) clearInterval(flashTimer)
      try { flashRef.current && flashRef.current.release && flashRef.current.release() } catch {}
    }
  }, [alarm])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="absolute inset-0 transition-opacity" style={{backgroundColor: tick%2===0?'rgba(255,255,255,0.12)':'transparent'}}></div>
      <div className="relative bg-slate-800/80 border border-blue-500/30 rounded-2xl p-6 max-w-sm mx-auto text-center">
        <div className="flex items-center justify-center mb-4">
          <AlarmClock className="w-10 h-10 text-blue-400"/>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">अलार्म बज रहा है</h2>
        <p className="text-blue-100 mb-4">{pad(alarm.hour)}:{pad(alarm.minute)} {alarm.ampm} • {alarm.label}</p>
        <button onClick={onStop} className="px-5 py-2 rounded-lg bg-red-600 text-white">बंद करें</button>
        <audio id="ringtone-el" src={alarm.ringtoneUrl || ''}></audio>
      </div>
    </div>
  )
}

const AlarmListItem = ({ alarm, onToggle, onEdit, onDelete, nextInMs }) => {
  const nextText = useMemo(() => {
    if (nextInMs == null) return ''
    let secs = Math.floor(nextInMs/1000)
    const days = Math.floor(secs/(3600*24)); secs -= days*3600*24
    const hours = Math.floor(secs/3600); secs -= hours*3600
    const mins = Math.floor(secs/60); secs -= mins*60
    const parts = []
    if (days) parts.push(`${days} दिन`)
    if (hours) parts.push(`${hours} घंटे`)
    if (mins) parts.push(`${mins} मिनट`)
    if (secs && !days && !hours) parts.push(`${secs} सेकेंड`)
    return parts.length? `अगला: ${parts.join(' ')} में` : ''
  }, [nextInMs])

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-blue-500/20">
      <div>
        <div className="text-white text-2xl font-semibold">{pad(alarm.hour)}:{pad(alarm.minute)} {alarm.ampm}</div>
        <div className="text-blue-200/80 text-sm flex items-center gap-2">
          <span>{alarm.label}</span>
          <span>•</span>
          <span>{alarm.repeat === 'custom' ? 'कस्टम दिन' : alarm.repeat === 'once' ? 'एक बार' : alarm.repeat === 'daily' ? 'दैनिक' : alarm.repeat === 'weekdays' ? 'कार्यदिवस' : 'सप्ताहांत'}</span>
          {nextText && (<><span>•</span><span>{nextText}</span></>)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-blue-100">
          <span>चालू</span>
          <input type="checkbox" checked={alarm.enabled} onChange={(e)=>onToggle(e.target.checked)} />
        </label>
        <button onClick={onEdit} className="p-2 rounded bg-slate-700/60 text-blue-100">Edit</button>
        <button onClick={onDelete} className="p-2 rounded bg-red-700/60 text-red-100"><Trash2 className="w-4 h-4"/></button>
      </div>
    </div>
  )
}

export default function AlarmApp(){
  const now = useNow()
  const [alarms, setAlarms] = useState(()=> loadAlarms().slice(0,6))
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [ringing, setRinging] = useState(null)

  useEffect(()=> saveAlarms(alarms), [alarms])

  // Background-ish scheduler using setInterval and visibility change
  useEffect(() => {
    const check = () => {
      const current = new Date()
      alarms.forEach((a) => {
        if (!a.enabled) return
        const ms = nextTriggerMs(current, a)
        // ring if within the current minute and seconds match 0
        if (ms <= 1000) {
          // If repeat once, disable after trigger
          setRinging(a)
          if (a.repeat === 'once') {
            setAlarms((arr)=> arr.map((x)=> x.id===a.id?{...x, enabled:false}:x))
          }
        }
      })
    }
    const t = setInterval(check, 1000)
    document.addEventListener('visibilitychange', check)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check) }
  }, [alarms])

  const addAlarm = () => {
    if (alarms.length >= 6) return alert('आप अधिकतम 6 अलार्म जोड़ सकते हैं')
    setEditing(defaultAlarm())
    setShowForm(true)
  }

  const saveAlarm = (data) => {
    setAlarms((prev) => {
      const exists = prev.find((x) => x.id === data.id)
      if (exists) return prev.map((x) => x.id === data.id ? data : x)
      return [...prev, data]
    })
    setShowForm(false)
    setEditing(null)
  }

  const stopRinging = () => setRinging(null)

  const upcomingMap = useMemo(()=>{
    const m = {}
    const n = new Date()
    alarms.forEach((a)=> { if(a.enabled) m[a.id] = nextTriggerMs(n, a) })
    return m
  }, [alarms, now])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.07),transparent_50%)]"></div>
      <div className="relative max-w-3xl mx-auto p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <div className="text-5xl font-bold text-white">{formatTime12(now)}</div>
            <div className="text-blue-200">{formatHindiDate(now)}</div>
          </div>
          <button onClick={addAlarm} className="px-4 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2">
            <Plus className="w-5 h-5"/> नया अलार्म
          </button>
        </header>

        <section className="space-y-3">
          {alarms.length === 0 && (
            <div className="text-blue-200/80">कोई अलार्म नहीं है। नया जोड़ें।</div>
          )}
          {alarms.map((a)=> (
            <AlarmListItem key={a.id}
              alarm={a}
              nextInMs={upcomingMap[a.id]}
              onToggle={(val)=> setAlarms((arr)=> arr.map((x)=> x.id===a.id?{...x, enabled:val}:x))}
              onEdit={()=>{ setEditing(a); setShowForm(true) }}
              onDelete={()=> setAlarms((arr)=> arr.filter((x)=> x.id!==a.id))}
            />
          ))}
        </section>

        {showForm && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-blue-500/20 rounded-2xl w-full max-w-lg">
              <AlarmForm
                initial={editing}
                onSave={saveAlarm}
                onCancel={()=>{ setShowForm(false); setEditing(null) }}
              />
            </div>
          </div>
        )}

        {ringing && (
          <AlarmRinging alarm={ringing} onStop={stopRinging}/>
        )}
      </div>
    </div>
  )
}
