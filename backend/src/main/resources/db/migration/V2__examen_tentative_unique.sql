-- Règle de l'Académie : une seule tentative à l'examen final, pour toutes les formations
update exams set attempts_allowed = 1 where attempts_allowed <> 1;
