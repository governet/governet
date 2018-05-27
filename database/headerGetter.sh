#!/bin/bash
# Bash sript for download, cleaning and bulk-inserting the data into the mongo database
## Specify which header files and data sets to download from the FEC FTP servers
headerfiles=("cm_header_file.csv" "cn_header_file.csv" "ccl_header_file.csv" "oppexp_header_file.csv" "oth_header_file.csv" "pas2_header_file.csv" "indiv_header_file.csv")
years=("2016") #"2014" "2016" "2018" "2012")
filetypes=("cm" "cn" "ccl" "pas2")

## Download each header file and replace the comma delimiters with tabs
for i in "${headerfiles[@]}"
do
    filename=`echo $i | cut -d_ -f1`
    echo $filename
    wget -O $filename.header https://cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com/bulk-downloads/data_dictionaries/$i
    sed -i.bak $'s/,/\t/g' $filename.header
done

# remove the backups
rm ./*.bak

## Create the governet database on mongo (currenly only works on an unauthenticated mongo; obvi change this)
mongo --eval "use governet"

## Get all the data files for the given years
for y in "${years[@]}"
do
    # make a subdirectory for each year
    mkdir $y
    for f in "${filetypes[@]}"
    do
        # download the files, save them in the year folder, unzip, replace quotes with single quotes, replace pipe delimiters with tabs, add header and bulk import to mongo
        wget -O $f${y:2}.zip https://cg-519a459a-0ea3-42c2-b7bc-fa1143481f74.s3-us-gov-west-1.amazonaws.com/bulk-downloads/$y/$f${y:2}.zip
        unzip $f${y:2} -d $y
        header=`cat $f.header`

        if [ "$f" = "pas2" ]
        then
            f2="itpas2"
        else 
            f2=$f
        fi

        sed -i.bak s/\"/\'/g ./$y/$f2.txt
        sed -i.bak $'s/\|/\t/g' ./$y/$f2.txt
        cat $f.header | cat - ./$y/$f2.txt > temp && mv temp ./$y/$f2.txt
        mongoimport -d governet -c $f --type tsv --file ./$y/$f2.txt --headerline
        rm ./$y/*.bak
    done
done

# clean up
rm ./*.zip
