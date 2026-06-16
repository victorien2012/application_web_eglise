import sys

with open('backend/api/models.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
for line in lines:
    out.append(line)
    if 'return self.titre' in line and len(out) > 340:
        break

with open('backend/api/models.py', 'w', encoding='utf-8') as f:
    f.writelines(out)
    f.write('\n\n')
    f.write('class CarrouselMedia(models.Model):\n')
    f.write('    TYPE_MEDIA_CHOICES = [\n')
    f.write('        (\'IMAGE\', \'Image\'),\n')
    f.write('        (\'VIDEO\', \'Vidéo\'),\n')
    f.write('    ]\n\n')
    f.write('    titre = models.CharField(max_length=255, blank=True, null=True, db_column=\'titre\')\n')
    f.write('    description = models.TextField(blank=True, null=True, db_column=\'description\')\n')
    f.write('    fichier = models.FileField(upload_to=\'carrousel/\', blank=True, null=True, db_column=\'fichier\', help_text=\'Fichier image.\')\n')
    f.write('    url_video = models.URLField(blank=True, null=True, db_column=\'url_video\', help_text=\'Lien YouTube si le type est Vidéo.\')\n')
    f.write('    type_media = models.CharField(max_length=10, choices=TYPE_MEDIA_CHOICES, default=\'IMAGE\', db_column=\'type_media\')\n')
    f.write('    est_actif = models.BooleanField(default=True, db_column=\'est_actif\', help_text=\'Indique si le média doit être affiché dans le carrousel.\')\n')
    f.write('    ordre = models.IntegerField(default=0, db_column=\'ordre\', help_text=\'Ordre d\\'affichage du média dans le carrousel.\')\n')
    f.write('    cree_le = models.DateTimeField(auto_now_add=True, db_column=\'cree_le\')\n\n')
    f.write('    class Meta:\n')
    f.write('        db_table = \'carrousel_media\'\n')
    f.write('        ordering = [\'ordre\', \'-cree_le\']\n\n')
    f.write('    def __str__(self):\n')
    f.write('        return self.titre if self.titre else f\"Média {self.id} ({self.type_media})\"\n')
