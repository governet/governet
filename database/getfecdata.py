import configparser
import argparse
import subprocess
import datetime

class dataImporter:
    def __init__(self, config):
        print("test")

class dataFetcher:
    def __init__(self, config, profile="DEFAULT"):
        self.config = config[profile]
        self.url = self.config["url"]
        self.outPath = self.config["outPath"]
        self.startYear = int(self.config["startYear"])
        self.endYear = int(self.config["endYear"])
        self.years = [str(year) for year in range(self.startYear, self.endYear+1)]
        self._dataTypes = [\
            {"type":"cn","format":".zip","description":""},\
            {"type":"cm","format":".zip","description":""},\
            {"type":"oppexp","format":".zip","description":""},\
            {"type":"oth","format":".zip","description":""},\
            {"type":"indiv","format":".zip","description":""},\
            {"type":"pas2","format":".zip","description":""}
        ]

    def _constructFilePath(self, type, format, url, year):
        _path = url + year + "/" + type + year[-2:] + format
        return _path

    def _constructAllFilePaths(self, dataTypes, url, year):
        _filePaths = []
        for _dataType in dataTypes:
            _filePaths.append(self._constructFilePath(_dataType["type"], _dataType["format"], url, year))
        return _filePaths

    def _constructHeaderPath(self, type, url):
        _path = url + "data_dictionaries/" + type + "_header_file.csv"
        return _path

    def _constructAllHeaderPaths(self, dataTypes, url):
        _headerPaths = []
        for _dataType in dataTypes:
            _headerPaths.append(self._constructHeaderPath(_dataType["type"], url))
        return _headerPaths

    def _fetchFile(self, url, outPath):
        directory = (outPath.split(outPath.split("/")[-1], 1)[0])
        subprocess.call(["mkdir", directory])
        subprocess.call(["wget", url, "-O", outPath])
        

    def _fetchFilesInYear(self, year):
        _allPaths = self._constructAllFilePaths(self._dataTypes, self.url, year)
        for _path in _allPaths:
            self._fetchFile(_path, self.outPath + _path.split(self.url, 1)[1])
        
    def _fetchHeaderFiles(self):
        _allHeaderPaths = self._constructAllHeaderPaths(self._dataTypes, self.url)
        for _headerPath in _allHeaderPaths:
            self._fetchFile(_headerPath, self.outPath + _headerPath.split(self.url, 1)[1])

    def fetchData(self):
        for year in self.years:
            self._fetchFilesInYear(year)
        self._fetchHeaderFiles()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='download FEC data and load it into a database')
    parser.add_argument('config', type=str, help='an absolute path to the governet FEC importer configuration file')
    args = parser.parse_args()

    config = configparser.ConfigParser()
    config.read(args.config)

    d = dataFetcher(config)
    
    d.fetchData()