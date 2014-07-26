# Schema's

## degree

(unvollständig: Promotion fehlt?)
https://lsf.uni-stuttgart.de/qisserver/rds?state=modulBeschrGast&nextdir=qispos/modulBeschr/gast
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

https://lsf.uni-stuttgart.de/qisserver/rds?state=change&type=3&next=TableSelect.vm&subdir=pord&P_start=0&P_anzahl=9999

 - lsf_id (40707, int)
 - lsf_modid (080100003, string)
 - lsf_modnum (14620, string)
 - name (Algebra, string)
 - credits (9.0, int*10)

## lecture

>> 1279: course.lsf_id, 20141: semester

https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=1279&veranstaltung.semester=20141&P_start=0&P_anzahl=9999
/// https://lsf.uni-stuttgart.de/qisserver/rds?state=wsearchv&search=1&subdir=veranstaltung&k_abstgv.abstgvnr=1279&P_start=0&P_anzahl=9999

 - lsf_id (149122, int)
 - lsf_lecnum (01370, string)
 - name (Algebra, string)
 - type (lecture, string) [lecture, tutorial, seminar, practicum]

## event

 - time
 - duration
 - location
 - lecture (ref)







