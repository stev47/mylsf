# Schema's

## degree

(unvollständig: Promotion fehlt?)
// https://lsf.uni-stuttgart.de/qisserver/rds?state=modulBeschrGast&nextdir=qispos/modulBeschr/gast
(lieber von einzelstudiengängen, siehe unten)

 - lsf_id (81)
 - name (where to get from? Bachelor of Science)

## major

(lieber von einzelstudiengängen, siehe unten)

 - lsf_id (105)
 - name (Mathematik)


## course

### all courses:

// https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=6&moduleParameter=abstgvSelect&next=SearchSelect.vm&subdir=stg
// https://lsf.uni-stuttgart.de/qisserver/rds?state=modulBeschrGast&nextdir=qispos/modulBeschr/gast&nodeID=auswahlBaum%7Cabschluss%3Aabschl%3D81
https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgPlanList

// Mathematik, Bachelor of Science, HF, PO 2011

 - lsf_id (1279, found in URL)

### single course:

>> 1279: course.lsf_id:
https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&publishContainer=stgContainer&publishid=1279

 - name (Langtext: Mathematik)
 - degree (Studiengangsabschluss: ref to degree, single)
 - major (Studiengang: ref to major, Mathematik)
 -[AbStgV (composed of degree and major: 81105)]
 - erver (Prüfungsversion: 2011, year only?)


## module

### all modules

https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=3&next=TableSelect.vm&subdir=pord&P_start=0&P_anzahl=9999

 - lsf_id (40707, int)

### single module

https://lsf.uni-stuttgart.de/qisserver/rds?state=verpublish&status=init&moduleCall=mhbHTMLDetail&publishConfFile=mhbdetail&publishSubDir=mhb&publishid=103349

 - name (Algebra, string)
 - active (true, bool)
 - modId (080100003, string)
 - modNum (14620, string)
 - credits (9, int)
 - creditHours (6, int)
 - duration (1, int, Semester)
 - rotationCycle ( [2, 1], [int, int], [Intervall (0 unregelmäßig), Start (1: Winter, 2: Sommer)] )
 - lectures ([ref, ref, ...], Array of refs)
 - lsf_lectureIds ([ref, ref, ...], Array of refs)
 - lsf_courseIds



## lecture

>> 1279: course.lsf_id, 20141: semester

https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=1279&veranstaltung.semester=20141&P_start=0&P_anzahl=9999
/// https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=1279&P_start=0&P_anzahl=9999

 - lsf_id (149122, int)
 - lecnum (01370, string)
 - name (Algebra, string)
 - type (lecture, string) [lecture, tutorial, seminar, practicum]

## event

 - time
 - duration
 - location
 - lecture (ref)







